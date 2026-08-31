"""Carga inicial da rede municipal de Igarassu/PE a partir do Censo Escolar 2025.

Lê o recorte em ``apps/governance/data/censo_2025_igarassu/`` (dados públicos do
INEP filtrados para o município 2606804, rede municipal) e monta:

- 1 Secretaria Municipal de Educação (SME Igarassu)
- Ano letivo 2025 + 4 bimestres
- Etapas de ensino (Infantil, Fundamental AI/AF, EJA) e disciplinas da BNCC
- Matrizes curriculares por etapa
- ~49 escolas com código INEP real
- Salas de aula (a partir de ``QT_SALAS_UTILIZADAS``)
- Turmas expandidas das contagens ``QT_TUR_*`` por série e turno

Idempotente (``get_or_create``). Reexecutar não duplica registros.

    python manage.py seed_censo_igarassu
"""

from __future__ import annotations

import csv
import string
from datetime import date, timedelta
from decimal import Decimal
from pathlib import Path

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.classes.models import Classroom, SchoolClass, Shift
from apps.curriculum.models import CurriculumMatrix, CurriculumMatrixItem, Subject
from apps.governance.models import (
    AcademicPeriod,
    AcademicYear,
    AcademicYearStatus,
    EducationDepartment,
    EducationStage,
    EvaluationType,
    StageType,
)
from apps.schools.models import School, SchoolType
from core.models import UserRole

User = get_user_model()

IBGE_IGARASSU = "2606804"
DEFAULT_DATA_DIR = Path(settings.BASE_DIR) / "apps" / "governance" / "data" / "censo_2025_igarassu"

# --- índices de coluna (1-based) nos CSV do Censo -----------------------------
ESC = {"nome": 17, "inep": 18, "localizacao": 22, "ano_ini": 26, "ano_fim": 27, "salas": 153}
TUR = {
    "inep": 18,
    "inf_cre": 28,
    "inf_pre": 29,
    "ai": {1: 32, 2: 33, 3: 34, 4: 35, 5: 36},
    "af": {6: 39, 7: 40, 8: 41, 9: 42},
    "eja_fund": 92,
    # turnos: (DM manhã, DV tarde, N noite, INT integral)
    "shift_inf_cre": (110, 111, 112, 176),
    "shift_inf_pre": (114, 115, 116, 177),
    "shift_ai": (122, 123, 124, 179),
    "shift_af": (126, 127, 128, 180),
    "shift_eja": (150, 151, 152, None),
}

_PT_MINOR = {"de", "da", "do", "das", "dos", "e", "a", "o"}


def _title_pt(text: str) -> str:
    words = text.strip().lower().split()
    out = []
    for i, w in enumerate(words):
        out.append(w if (w in _PT_MINOR and i != 0) else w.capitalize())
    return " ".join(out)


def _parse_sas_date(value: str) -> date | None:
    """Converte ``10FEB2025:00:00:00`` em ``date(2025, 2, 10)``."""
    value = (value or "").strip().strip('"')
    if not value:
        return None
    months = {
        "JAN": 1, "FEB": 2, "MAR": 3, "APR": 4, "MAY": 5, "JUN": 6,
        "JUL": 7, "AUG": 8, "SEP": 9, "OCT": 10, "NOV": 11, "DEC": 12,
    }
    try:
        head = value.split(":")[0]
        day, mon, year = int(head[:2]), months[head[2:5].upper()], int(head[5:9])
        return date(year, mon, day)
    except (KeyError, ValueError):
        return None


def _int(value: str) -> int:
    value = (value or "").strip()
    try:
        return int(value)
    except ValueError:
        return 0


def _letters():
    """A, B, …, Z, AA, AB, … — sufixos de turma."""
    for c in string.ascii_uppercase:
        yield c
    for a in string.ascii_uppercase:
        for b in string.ascii_uppercase:
            yield a + b


def _distribute_shifts(count: int, weights: tuple[int, int, int, int | None]) -> list[str]:
    """Reparte ``count`` turmas entre turnos conforme os pesos do Censo
    (maior resto). Sem pesos → todas de manhã."""
    labels = [Shift.MORNING, Shift.AFTERNOON, Shift.NIGHT, Shift.FULL_TIME]
    w = [max(0, x or 0) for x in weights]
    total = sum(w)
    if count <= 0:
        return []
    if total == 0:
        return [Shift.MORNING] * count

    raw = [count * x / total for x in w]
    alloc = [int(x) for x in raw]
    remainder = count - sum(alloc)
    for idx in sorted(range(4), key=lambda i: raw[i] - alloc[i], reverse=True)[:remainder]:
        alloc[idx] += 1

    result: list[str] = []
    for label, n in zip(labels, alloc):
        result.extend([label] * n)
    return result


# --- catálogo curricular (BNCC) ---------------------------------------------
STAGES = [
    ("EI", "Educação Infantil", StageType.INFANTIL, EvaluationType.DESCRIPTIVE),
    ("EF_AI", "Ensino Fundamental — Anos Iniciais", StageType.FUNDAMENTAL_I, EvaluationType.NUMERIC),
    ("EF_AF", "Ensino Fundamental — Anos Finais", StageType.FUNDAMENTAL_II, EvaluationType.NUMERIC),
    ("EJA_EF", "EJA — Ensino Fundamental", StageType.EJA, EvaluationType.NUMERIC),
]

SUBJECTS = [
    ("Língua Portuguesa", "Linguagens"),
    ("Arte", "Linguagens"),
    ("Educação Física", "Linguagens"),
    ("Língua Inglesa", "Linguagens"),
    ("Matemática", "Matemática"),
    ("Ciências", "Ciências da Natureza"),
    ("História", "Ciências Humanas"),
    ("Geografia", "Ciências Humanas"),
    ("Ensino Religioso", "Ensino Religioso"),
]

# disciplinas por etapa e carga horária semanal aproximada
MATRIX_SUBJECTS = {
    "EI": [("Língua Portuguesa", 5), ("Arte", 3), ("Educação Física", 2), ("Matemática", 5)],
    "EF_AI": [
        ("Língua Portuguesa", 6), ("Matemática", 6), ("Ciências", 3), ("História", 2),
        ("Geografia", 2), ("Arte", 2), ("Educação Física", 2), ("Ensino Religioso", 1),
    ],
    "EF_AF": [
        ("Língua Portuguesa", 5), ("Matemática", 5), ("Ciências", 4), ("História", 3),
        ("Geografia", 3), ("Língua Inglesa", 2), ("Arte", 2), ("Educação Física", 2),
        ("Ensino Religioso", 1),
    ],
    "EJA_EF": [
        ("Língua Portuguesa", 4), ("Matemática", 4), ("Ciências", 2), ("História", 2),
        ("Geografia", 2), ("Arte", 1), ("Ensino Religioso", 1),
    ],
}


class Command(BaseCommand):
    help = "Carga inicial da rede municipal de Igarassu/PE a partir do Censo Escolar 2025."

    def add_arguments(self, parser):
        parser.add_argument("--data-dir", default=str(DEFAULT_DATA_DIR))
        parser.add_argument("--year", type=int, default=2025)
        parser.add_argument(
            "--no-admin",
            action="store_true",
            help="Não cria os usuários administrativos iniciais (admin/supervisor).",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        data_dir = Path(options["data_dir"])
        escolas_csv = data_dir / "escolas.csv"
        turmas_csv = data_dir / "turmas.csv"
        if not escolas_csv.exists() or not turmas_csv.exists():
            raise CommandError(f"CSV do Censo não encontrado em {data_dir}")

        self.stdout.write(self.style.SUCCESS("Carga do Censo 2025 — Igarassu/PE"))

        dept = self._seed_department()
        if not options["no_admin"]:
            self._seed_users(dept)
        year = self._seed_academic_year(dept, options["year"])
        self._seed_periods(year)
        stages = self._seed_stages()
        subjects = self._seed_subjects(dept)
        matrices = self._seed_matrices(dept, stages, subjects)

        escolas = list(self._read_csv(escolas_csv))
        turmas_by_inep = {row[TUR["inep"] - 1]: row for row in self._read_csv(turmas_csv)}

        counters = {"schools": 0, "classrooms": 0, "classes": 0}
        for row in escolas:
            school = self._seed_school(dept, row, turmas_by_inep.get(row[ESC["inep"] - 1]))
            counters["schools"] += 1
            rooms = self._seed_classrooms(school, _int(row[ESC["salas"] - 1]))
            counters["classrooms"] += len(rooms)
            turma_row = turmas_by_inep.get(school.inep_code)
            if turma_row:
                counters["classes"] += self._seed_classes(
                    school, year, matrices, turma_row, rooms
                )

        self._report(dept, counters)

    # ------------------------------------------------------------------ helpers
    @staticmethod
    def _read_csv(path: Path):
        with path.open(encoding="utf-8", newline="") as fh:
            reader = csv.reader(fh, delimiter=";")
            next(reader, None)  # cabeçalho
            for row in reader:
                if row:
                    yield row

    # ------------------------------------------------------------------ seeders
    def _seed_department(self) -> EducationDepartment:
        dept, _ = EducationDepartment.objects.get_or_create(
            ibge_code=IBGE_IGARASSU,
            defaults={
                "municipality_name": "Igarassu",
                "secretary_name": "",
                "min_passing_grade": Decimal("6.00"),
                "min_attendance_percentage": Decimal("75.00"),
            },
        )
        self.stdout.write(f"  SME: {dept}")
        return dept

    def _seed_users(self, dept):
        from core.validators import generate_cpf

        specs = [
            ("admin", "admin123", UserRole.SME_ADMIN, "Administrador", "SME Igarassu", True),
            ("supervisor", "supervisor123", UserRole.SME_SUPERVISOR, "Supervisor", "Pedagógico", False),
        ]
        for idx, (username, password, role, first, last, is_super) in enumerate(specs):
            cpf = generate_cpf(900_000 + idx)
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    "cpf": cpf,
                    "email": f"{username}@igarassu.pe.gov.br",
                    "first_name": first,
                    "last_name": last,
                    "role": role,
                    "education_department": dept,
                    "is_staff": is_super,
                    "is_superuser": is_super,
                },
            )
            if created:
                user.set_password(password)
                user.save()
                self.stdout.write(f"  Usuário criado: {username} / {password}")
            elif user.education_department_id != dept.id:
                user.education_department = dept
                user.save(update_fields=["education_department"])

    def _seed_academic_year(self, dept, year_num: int) -> AcademicYear:
        year, _ = AcademicYear.objects.get_or_create(
            education_department=dept,
            year=year_num,
            defaults={
                "status": AcademicYearStatus.ACTIVE,
                "start_date": date(year_num, 2, 10),
                "end_date": date(year_num, 12, 31),
            },
        )
        return year

    def _seed_periods(self, year: AcademicYear):
        span = (year.end_date - year.start_date) / 4
        for i in range(1, 5):
            start = year.start_date + span * (i - 1)
            end = year.start_date + span * i - timedelta(days=1)
            AcademicPeriod.objects.get_or_create(
                academic_year=year,
                period_number=i,
                defaults={
                    "name": f"{i}º Bimestre",
                    "start_date": start,
                    "end_date": end,
                    "grade_deadline": end + timedelta(days=7),
                },
            )

    def _seed_stages(self) -> dict[str, EducationStage]:
        out = {}
        for code, name, stype, etype in STAGES:
            stage, _ = EducationStage.objects.get_or_create(
                code=code,
                defaults={"name": name, "stage_type": stype, "evaluation_type": etype},
            )
            out[code] = stage
        return out

    def _seed_subjects(self, dept) -> dict[str, Subject]:
        out = {}
        for name, area in SUBJECTS:
            subject, _ = Subject.objects.get_or_create(
                education_department=dept,
                name=name,
                defaults={"area_of_knowledge": area},
            )
            out[name] = subject
        return out

    def _seed_matrices(self, dept, stages, subjects) -> dict[str, CurriculumMatrix]:
        out = {}
        for code, stage in stages.items():
            matrix, _ = CurriculumMatrix.objects.get_or_create(
                education_department=dept,
                education_stage=stage,
                defaults={"name": f"Matriz Curricular — {stage.name} ({date.today().year})"},
            )
            for subject_name, weekly in MATRIX_SUBJECTS[code]:
                CurriculumMatrixItem.objects.get_or_create(
                    curriculum_matrix=matrix,
                    subject=subjects[subject_name],
                    defaults={"weekly_hours": weekly, "annual_hours": weekly * 40},
                )
            out[code] = matrix
        return out

    def _seed_school(self, dept, row, turma_row) -> School:
        inep = row[ESC["inep"] - 1].strip()
        name = _title_pt(row[ESC["nome"] - 1])
        school_type = self._infer_school_type(turma_row)
        school, created = School.objects.get_or_create(
            inep_code=inep,
            defaults={
                "education_department": dept,
                "name": name,
                "school_type": school_type,
                "address_city": "Igarassu",
                "address_state": "PE",
                "max_students_per_class": 30,
            },
        )
        if not created:
            updated = False
            if school.education_department_id != dept.id:
                school.education_department = dept
                updated = True
            if school.school_type != school_type:
                school.school_type = school_type
                updated = True
            if updated:
                school.save(update_fields=["education_department", "school_type", "updated_at"])
        return school

    @staticmethod
    def _infer_school_type(turma_row) -> str:
        if not turma_row:
            return SchoolType.MISTA
        cre = _int(turma_row[TUR["inf_cre"] - 1])
        pre = _int(turma_row[TUR["inf_pre"] - 1])
        ai = sum(_int(turma_row[c - 1]) for c in TUR["ai"].values())
        af = sum(_int(turma_row[c - 1]) for c in TUR["af"].values())
        infantil = cre + pre
        fundamental = ai + af

        if infantil and fundamental:
            return SchoolType.MISTA
        if ai and af:
            return SchoolType.MISTA
        if cre and not pre and not fundamental:
            return SchoolType.CRECHE
        if pre and not cre and not fundamental:
            return SchoolType.PRE_ESCOLA
        if ai and not af:
            return SchoolType.FUNDAMENTAL_1
        if af and not ai:
            return SchoolType.FUNDAMENTAL_2
        return SchoolType.MISTA

    def _seed_classrooms(self, school, count: int) -> list[Classroom]:
        rooms = []
        for i in range(1, max(count, 1) + 1):
            room, _ = Classroom.objects.get_or_create(
                school=school,
                number=f"{i:02d}",
                defaults={"capacity": 30, "floor": 1, "building": "Bloco A"},
            )
            rooms.append(room)
        return rooms

    def _seed_classes(self, school, year, matrices, turma_row, rooms) -> int:
        """Expande as contagens QT_TUR_* em turmas nominais."""
        room_cycle = _room_cycler(rooms)
        created = 0

        plans: list[tuple[str, str, int, tuple, int]] = []
        # (rótulo base, código da matriz, quantidade, pesos de turno, capacidade)
        cre = _int(turma_row[TUR["inf_cre"] - 1])
        pre = _int(turma_row[TUR["inf_pre"] - 1])
        if cre:
            plans.append(("Creche", "EI", cre,
                          tuple(_int(turma_row[c - 1]) if c else 0 for c in TUR["shift_inf_cre"]), 20))
        if pre:
            plans.append(("Pré-escola", "EI", pre,
                          tuple(_int(turma_row[c - 1]) if c else 0 for c in TUR["shift_inf_pre"]), 25))
        for grade, col in TUR["ai"].items():
            n = _int(turma_row[col - 1])
            if n:
                plans.append((f"{grade}º Ano", "EF_AI", n,
                              tuple(_int(turma_row[c - 1]) if c else 0 for c in TUR["shift_ai"]), 30))
        for grade, col in TUR["af"].items():
            n = _int(turma_row[col - 1])
            if n:
                plans.append((f"{grade}º Ano", "EF_AF", n,
                              tuple(_int(turma_row[c - 1]) if c else 0 for c in TUR["shift_af"]), 35))
        eja = _int(turma_row[TUR["eja_fund"] - 1])
        if eja:
            plans.append(("EJA Fundamental", "EJA_EF", eja,
                          tuple(_int(turma_row[c - 1]) if c else 0 for c in TUR["shift_eja"]), 35))

        for label, matrix_code, qty, weights, capacity in plans:
            shifts = _distribute_shifts(qty, weights)
            for suffix, shift in zip(_letters(), shifts):
                _, was_created = SchoolClass.objects.get_or_create(
                    school=school,
                    academic_year=year,
                    name=f"{label} {suffix}",
                    defaults={
                        "curriculum_matrix": matrices[matrix_code],
                        "shift": shift,
                        "max_capacity": capacity,
                        "classroom": next(room_cycle),
                    },
                )
                created += int(was_created)
        return created

    def _report(self, dept, counters):
        self.stdout.write(self.style.SUCCESS("Carga concluída"))
        self.stdout.write(f"  Secretaria: {dept.municipality_name} (IBGE {dept.ibge_code})")
        self.stdout.write(f"  Escolas: {School.objects.filter(education_department=dept).count()}")
        self.stdout.write(f"  Salas de aula: {Classroom.objects.filter(school__education_department=dept).count()}")
        self.stdout.write(f"  Turmas: {SchoolClass.objects.filter(school__education_department=dept).count()}")
        self.stdout.write(f"  Disciplinas: {Subject.objects.filter(education_department=dept).count()}")
        self.stdout.write(f"  Matrizes curriculares: {CurriculumMatrix.objects.filter(education_department=dept).count()}")


def _room_cycler(rooms):
    if not rooms:
        while True:
            yield None
    i = 0
    while True:
        yield rooms[i % len(rooms)]
        i += 1
