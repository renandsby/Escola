"""Carga de dados fictícios para o Dashboard Gerencial (ambiente de dev).

Preenche a camada transacional que o `seed_censo_igarassu` não cria — alunos,
matrículas, frequência, notas, pareceres, alocação docente e transferências —
com uma distribuição pensada para acender **todos** os painéis do dashboard:
KPIs, tendência de frequência (4 bimestres), rendimento por etapa, matrículas
por etapa/turno, movimentação e a tabela de completude do diário.

Uso:
    python manage.py seed_dashboard_demo                 # 14 escolas, 20 alunos/turma
    python manage.py seed_dashboard_demo --schools 25 --per-class 24
    python manage.py seed_dashboard_demo --fresh         # limpa o que este comando criou antes

Tudo que este comando cria carrega o prefixo ``DEMO`` nos identificadores
(``unique_municipal_id``, ``enrollment_number``, matrícula funcional docente),
então ``--fresh`` remove só a carga de demonstração — nunca dados reais.
"""

from __future__ import annotations

import random
from datetime import date, timedelta

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.class_diary.models import Attendance, DescriptiveEvaluation, Grade
from apps.classes.models import SchoolClass, TeacherAllocation, TeacherProfile
from apps.curriculum.models import CurriculumMatrixItem
from apps.governance.models import (
    AcademicPeriod,
    AcademicYear,
    AcademicYearStatus,
    EducationDepartment,
)
from apps.students.models import (
    Enrollment,
    EnrollmentStatus,
    Student,
    TransferRequest,
    TransferRequestStatus,
)
from core.models import User, UserRole

DEMO_ID_PREFIX = "DEMO"
DEMO_TEACHER_REG = "DEMO-T-"
DEMO_TEACHER_USER = "demo.prof."

FIRST_NAMES = [
    "Ana", "Beatriz", "Carlos", "Daniel", "Eduarda", "Felipe", "Gabriela", "Heitor",
    "Isabela", "João", "Larissa", "Lucas", "Mariana", "Miguel", "Natália", "Otávio",
    "Paula", "Rafael", "Sofia", "Thiago", "Valentina", "Vitor", "Yasmin", "Bruno",
]
LAST_NAMES = [
    "Silva", "Santos", "Oliveira", "Souza", "Lima", "Pereira", "Costa", "Ferreira",
    "Alves", "Ribeiro", "Rodrigues", "Barbosa", "Gomes", "Martins", "Araújo", "Melo",
    "Cavalcanti", "Nascimento", "Andrade", "Cardoso",
]

# alvo de completude do diário por turma (rotaciona → espalha o status na tabela)
COMPLETENESS_CYCLE = [1.0, 1.0, 0.92, 0.7, 0.7, 0.45, 0.25, 0.0]


class Command(BaseCommand):
    help = "Popula o Dashboard Gerencial com dados fictícios (ambiente de dev)."

    def add_arguments(self, parser):
        parser.add_argument("--department", default="Igarassu",
                            help="Nome do município ou UUID da secretaria (default: Igarassu).")
        parser.add_argument("--schools", type=int, default=0,
                            help="Quantas escolas povoar (0 = todas, default).")
        parser.add_argument("--per-class", type=int, default=18,
                            help="Média de alunos por turma (default: 18).")
        parser.add_argument("--attendance-days", type=int, default=20,
                            help="Dias letivos de frequência por aluno, no total (default: 20).")
        parser.add_argument("--seed", type=int, default=42, help="Semente aleatória.")
        parser.add_argument("--fresh", action="store_true",
                            help="Remove a carga de demonstração anterior antes de recriar.")

    # ------------------------------------------------------------------ #

    def handle(self, *args, **opt):
        self.rng = random.Random(opt["seed"])
        dept = self._resolve_department(opt["department"])
        year = self._active_year(dept)
        periods = self._realign_periods(year)
        current_period = self._pick_current_period(periods)

        if opt["fresh"]:
            self._purge(dept)

        self.stdout.write(self.style.SUCCESS(
            f"Dashboard demo — {dept.municipality_name} · ano letivo {year.year} · "
            f"período corrente {current_period.name}"
        ))

        with transaction.atomic():
            teachers = self._ensure_teachers(dept, count=48)
            classes = self._pick_classes(dept, opt["schools"])
            if not classes:
                raise CommandError(
                    "Nenhuma turma encontrada para essa secretaria. "
                    "Rode primeiro: python manage.py seed_censo_igarassu"
                )
            items_by_matrix = self._matrix_items(classes)

            enrollments = self._seed_students_and_enrollments(
                dept, year, classes, opt["per_class"]
            )
            self._seed_allocations(classes, teachers)
            self._seed_attendance(enrollments, periods, opt["attendance_days"])
            self._seed_grades(enrollments, classes, items_by_matrix, current_period, teachers)
            self._seed_descriptive(enrollments, classes, current_period, teachers)
            self._seed_dropouts(enrollments)
            self._seed_transfers(dept, year, classes)
            self._seed_previous_year(dept, year, classes, enrollments)

        self._report(dept, year)

    # ------------------------------------------------------------------ #
    #  Pré-requisitos                                                     #
    # ------------------------------------------------------------------ #

    def _resolve_department(self, ref: str) -> EducationDepartment:
        qs = EducationDepartment.objects.all()
        dept = (
            qs.filter(id=ref).first()
            if "-" in ref
            else qs.filter(municipality_name__iexact=ref).first()
        )
        if not dept:
            raise CommandError(f"Secretaria '{ref}' não encontrada.")
        return dept

    def _active_year(self, dept) -> AcademicYear:
        year = (
            AcademicYear.objects.filter(
                education_department=dept, status=AcademicYearStatus.ACTIVE
            ).order_by("-year").first()
            or AcademicYear.objects.filter(education_department=dept).order_by("-year").first()
        )
        if not year:
            raise CommandError(
                "Secretaria sem ano letivo. Rode: python manage.py seed_censo_igarassu"
            )
        return year

    def _realign_periods(self, year) -> list[AcademicPeriod]:
        """Garante 4 bimestres e, se o ano já terminou no calendário, desloca as
        datas para uma janela que contenha hoje — assim o painel mostra um
        período corrente com prazo de notas ainda em aberto."""
        periods = list(year.periods.order_by("period_number"))
        if len(periods) < 4:
            raise CommandError("Ano letivo sem os 4 bimestres. Rode seed_censo_igarassu.")

        today = date.today()
        if periods[-1].end_date < today:
            start = today - timedelta(days=210)  # ~7 meses atrás
            span = timedelta(days=63)
            for i, p in enumerate(periods):
                p.start_date = start + span * i
                p.end_date = start + span * (i + 1) - timedelta(days=1)
                p.grade_deadline = p.end_date + timedelta(days=7)
                p.save(update_fields=["start_date", "end_date", "grade_deadline"])
            self.stdout.write("  bimestres deslocados para conter a data de hoje")
        return periods

    def _pick_current_period(self, periods) -> AcademicPeriod:
        today = date.today()
        for p in periods:
            if p.start_date <= today <= p.end_date:
                return p
        return periods[-1]

    # ------------------------------------------------------------------ #
    #  Limpeza                                                            #
    # ------------------------------------------------------------------ #

    def _purge(self, dept):
        students = Student.objects.filter(
            education_department=dept, unique_municipal_id__startswith=DEMO_ID_PREFIX
        )
        enr = Enrollment.objects.filter(student__in=students)
        n_att = Attendance.objects.filter(enrollment__in=enr).delete()[0]
        n_grade = Grade.objects.filter(enrollment__in=enr).delete()[0]
        n_desc = DescriptiveEvaluation.objects.filter(enrollment__in=enr).delete()[0]
        n_tr = TransferRequest.objects.filter(student__in=students).delete()[0]
        n_enr = enr.delete()[0]
        n_stu = students.delete()[0]
        n_mirror = SchoolClass.objects.filter(
            school__education_department=dept, name__endswith="(ano anterior)"
        ).delete()[0]
        demo_teachers = TeacherProfile.objects.filter(
            education_department=dept, registration_number__startswith=DEMO_TEACHER_REG
        )
        n_alloc = TeacherAllocation.objects.filter(teacher_profile__in=demo_teachers).delete()[0]
        n_tp = demo_teachers.delete()[0]
        User.objects.filter(username__startswith=DEMO_TEACHER_USER).delete()
        self.stdout.write(
            f"  fresh: -{n_stu} alunos · -{n_enr} matrículas · -{n_att} freq · "
            f"-{n_grade} notas · -{n_desc} pareceres · -{n_tr} transf · "
            f"-{n_alloc} alocações · -{n_tp} docentes · -{n_mirror} turmas (ano anterior)"
        )

    # ------------------------------------------------------------------ #
    #  Seeders                                                            #
    # ------------------------------------------------------------------ #

    def _ensure_teachers(self, dept, *, count) -> list[TeacherProfile]:
        existing = list(
            TeacherProfile.objects.filter(
                education_department=dept, registration_number__startswith=DEMO_TEACHER_REG
            )
        )
        for i in range(len(existing), count):
            user = User.objects.create(
                username=f"{DEMO_TEACHER_USER}{i:03d}",
                email=f"{DEMO_TEACHER_USER}{i:03d}@demo.local",
                first_name=self.rng.choice(FIRST_NAMES),
                last_name=f"{self.rng.choice(LAST_NAMES)} {self.rng.choice(LAST_NAMES)}",
                role=UserRole.TEACHER,
                education_department=dept,
            )
            existing.append(
                TeacherProfile.objects.create(
                    user=user,
                    education_department=dept,
                    registration_number=f"{DEMO_TEACHER_REG}{i:04d}",
                    cpf=f"9{i:010d}"[:11],
                    formation_area="Pedagogia",
                )
            )
        return existing

    def _pick_classes(self, dept, n_schools) -> list[SchoolClass]:
        school_ids = list(
            SchoolClass.objects.filter(
                school__education_department=dept, deleted_at__isnull=True
            )
            .order_by("school__name")
            .values_list("school_id", flat=True)
            .distinct()
        )
        if n_schools and n_schools < len(school_ids):
            self.rng.shuffle(school_ids)
            school_ids = school_ids[:n_schools]
        return list(
            SchoolClass.objects.filter(
                school_id__in=school_ids, deleted_at__isnull=True
            )
            .order_by("school__name", "name")
            .select_related("school", "curriculum_matrix__education_stage")
        )

    def _matrix_items(self, classes) -> dict:
        matrix_ids = {c.curriculum_matrix_id for c in classes}
        out: dict = {}
        for item in CurriculumMatrixItem.objects.filter(
            curriculum_matrix_id__in=matrix_ids
        ).select_related("subject"):
            out.setdefault(item.curriculum_matrix_id, []).append(item.subject)
        return out

    def _seed_students_and_enrollments(self, dept, year, classes, per_class):
        seq = self._next_seq(Student, "unique_municipal_id", DEMO_ID_PREFIX)
        eseq = self._next_seq(Enrollment, "enrollment_number", DEMO_ID_PREFIX)

        # tamanho de cada turma decidido UMA vez
        plan = []
        for klass in classes:
            n = max(6, int(self.rng.gauss(per_class, 3)))
            n = min(n, klass.max_capacity + self.rng.randint(-2, 3))
            plan.append((klass, n))

        students = []
        for klass, n in plan:
            for _ in range(n):
                fn = self.rng.choice(FIRST_NAMES)
                ln = f"{self.rng.choice(LAST_NAMES)} {self.rng.choice(LAST_NAMES)}"
                students.append(Student(
                    education_department=dept,
                    unique_municipal_id=f"{DEMO_ID_PREFIX}{seq:07d}",
                    full_name=f"{fn} {ln}",
                    mother_name=f"{self.rng.choice(FIRST_NAMES)} {self.rng.choice(LAST_NAMES)}",
                    birth_date=self._birth_date(klass),
                    gender=self.rng.choice(["M", "F"]),
                    race_color=self.rng.choice(
                        ["BRANCA", "PARDA", "PARDA", "PRETA", "AMARELA", "NAO_DECLARADA"]
                    ),
                ))
                seq += 1
        Student.objects.bulk_create(students, batch_size=1000)

        pool = list(
            Student.objects.filter(unique_municipal_id__startswith=DEMO_ID_PREFIX)
            .order_by("unique_municipal_id")
        )[-len(students):]

        enrollments, cursor = [], 0
        for klass, n in plan:
            for stu in pool[cursor:cursor + n]:
                enrollments.append(Enrollment(
                    student=stu, school_class=klass, academic_year=year,
                    enrollment_number=f"{DEMO_ID_PREFIX}{eseq:07d}",
                    status=EnrollmentStatus.ENROLLED,
                ))
                eseq += 1
            cursor += n
        Enrollment.objects.bulk_create(enrollments, batch_size=1000)
        return list(
            Enrollment.objects.filter(
                enrollment_number__startswith=DEMO_ID_PREFIX, academic_year=year
            )
            .order_by("enrollment_number")
            .select_related("school_class__curriculum_matrix__education_stage", "student")
        )

    def _seed_allocations(self, classes, teachers):
        allocs = []
        existing = set(
            TeacherAllocation.objects.filter(
                school_class__in=classes, is_regent=True
            ).values_list("school_class_id", flat=True)
        )
        for klass in classes:
            if klass.id in existing:
                continue
            if self.rng.random() < 0.92:  # ~8% das turmas sem regente (de propósito)
                allocs.append(TeacherAllocation(
                    teacher_profile=self.rng.choice(teachers),
                    school_class=klass,
                    subject=None,
                    is_regent=True,
                ))
        TeacherAllocation.objects.bulk_create(allocs, batch_size=1000, ignore_conflicts=True)

    def _seed_attendance(self, enrollments, periods, days):
        rng = self.rng
        today = date.today()
        windows = [
            (p.period_number, p.start_date, min(p.end_date, today))
            for p in periods
            if p.start_date <= today
        ]
        if not windows:
            return
        per_window = max(3, days // len(windows))
        # dias letivos por bimestre (amostra uniformemente espaçada de dias úteis)
        window_days: list[tuple[int, list[date]]] = []
        for num, start, end in windows:
            weekdays = [
                start + timedelta(days=i)
                for i in range((end - start).days + 1)
                if (start + timedelta(days=i)).weekday() < 5
            ]
            if not weekdays:
                continue
            step = max(1, len(weekdays) // per_window)
            window_days.append((num, weekdays[::step][:per_window]))

        # leve declínio de frequência ao longo do ano — deixa a linha do gráfico viva
        window_factor = {num: 1.0 - 0.02 * idx for idx, (num, _) in enumerate(window_days)}

        rows = []
        for enr in enrollments:
            truant = rng.random() < 0.07  # ~7% abaixo de 75%
            base = 0.62 if truant else rng.uniform(0.9, 0.98)
            for num, dates in window_days:
                p_present = min(0.99, base * window_factor.get(num, 1.0))
                for d in dates:
                    if rng.random() < p_present:
                        status = "PRESENT"
                    else:
                        status = "EXCUSED_ABSENCE" if rng.random() < 0.4 else "ABSENT"
                    rows.append(Attendance(
                        enrollment=enr, school_class_id=enr.school_class_id,
                        date=d, status=status,
                    ))
        Attendance.objects.bulk_create(rows, batch_size=3000)

    def _seed_grades(self, enrollments, classes, items_by_matrix, period, teachers):
        rng = self.rng
        stage_by_class = {c.id: c.curriculum_matrix.education_stage.stage_type for c in classes}
        target_by_class = {
            c.id: COMPLETENESS_CYCLE[i % len(COMPLETENESS_CYCLE)]
            for i, c in enumerate(sorted(classes, key=lambda c: (c.school_id, c.name)))
        }
        teacher_users = [t.user for t in teachers]
        rows = []
        for enr in enrollments:
            if stage_by_class.get(enr.school_class_id) == "INFANTIL":
                continue  # etapa qualitativa — sem nota (R3)
            subjects = items_by_matrix.get(enr.school_class.curriculum_matrix_id, [])
            target = target_by_class.get(enr.school_class_id, 0.0)
            for subject in subjects:
                if rng.random() > target:
                    continue
                score = round(
                    max(0, min(10, rng.gauss(7.1, 1.8))), 1
                )
                rows.append(Grade(
                    enrollment=enr, subject=subject, academic_period=period,
                    teacher=rng.choice(teacher_users), score=score,
                    assessment_type="PERIOD_EXAM",
                ))
        Grade.objects.bulk_create(rows, batch_size=2000, ignore_conflicts=True)

    def _seed_descriptive(self, enrollments, classes, period, teachers):
        rng = self.rng
        infantil = {
            c.id for c in classes
            if c.curriculum_matrix.education_stage.stage_type == "INFANTIL"
        }
        teacher_users = [t.user for t in teachers]
        rows = []
        for enr in enrollments:
            if enr.school_class_id not in infantil:
                continue
            if rng.random() < 0.7:  # ~70% dos pareceres entregues
                rows.append(DescriptiveEvaluation(
                    enrollment=enr, academic_period=period,
                    teacher=rng.choice(teacher_users),
                    development_report="Desenvolvimento dentro do esperado para a faixa etária.",
                ))
        DescriptiveEvaluation.objects.bulk_create(rows, batch_size=1000, ignore_conflicts=True)

    def _seed_dropouts(self, enrollments):
        n = max(1, int(len(enrollments) * 0.015))
        for enr in self.rng.sample(enrollments, min(n, len(enrollments))):
            Enrollment.objects.filter(pk=enr.pk).update(status=EnrollmentStatus.DROPOUT)

    def _seed_previous_year(self, dept, year, classes, enrollments):
        """Ano letivo anterior enxuto — turmas-espelho + matrículas + frequência,
        só o suficiente para a série 'ano anterior' do gráfico de tendência."""
        rng = self.rng
        prev, _ = AcademicYear.objects.get_or_create(
            education_department=dept,
            year=year.year - 1,
            defaults={
                "status": AcademicYearStatus.CLOSED,
                "start_date": date(year.year - 1, 2, 10),
                "end_date": date(year.year - 1, 12, 20),
            },
        )
        today = date.today()
        base = today - timedelta(days=210 + 364)
        span = timedelta(days=63)
        prev_periods = []
        for i in range(1, 5):
            p, _ = AcademicPeriod.objects.get_or_create(
                academic_year=prev,
                period_number=i,
                defaults={
                    "name": f"{i}º Bimestre",
                    "start_date": base + span * (i - 1),
                    "end_date": base + span * i - timedelta(days=1),
                    "grade_deadline": base + span * i + timedelta(days=6),
                },
            )
            prev_periods.append(p)

        # turmas-espelho (uma por turma de 2025)
        existing = set(
            SchoolClass.objects.filter(
                academic_year=prev, name__endswith="(ano anterior)"
            ).values_list("school_id", "name")
        )
        mirrors = [
            SchoolClass(
                school_id=c.school_id,
                academic_year=prev,
                curriculum_matrix_id=c.curriculum_matrix_id,
                name=f"{c.name} (ano anterior)",
                shift=c.shift,
                max_capacity=c.max_capacity,
            )
            for c in classes
            if (c.school_id, f"{c.name} (ano anterior)") not in existing
        ]
        SchoolClass.objects.bulk_create(mirrors, batch_size=1000)
        mirror_by_key = {
            (m.school_id, m.name): m
            for m in SchoolClass.objects.filter(
                academic_year=prev, name__endswith="(ano anterior)"
            )
        }

        eseq = self._next_seq(Enrollment, "enrollment_number", DEMO_ID_PREFIX)
        prev_enr = []
        for enr in enrollments:
            if rng.random() > 0.75:
                continue
            c = enr.school_class
            mirror = mirror_by_key.get((c.school_id, f"{c.name} (ano anterior)"))
            if not mirror:
                continue
            prev_enr.append(Enrollment(
                student=enr.student, school_class=mirror, academic_year=prev,
                enrollment_number=f"{DEMO_ID_PREFIX}{eseq:07d}", status=EnrollmentStatus.ENROLLED,
            ))
            eseq += 1
        Enrollment.objects.bulk_create(prev_enr, batch_size=1000)
        prev_enr = list(
            Enrollment.objects.filter(
                academic_year=prev, enrollment_number__startswith=DEMO_ID_PREFIX
            ).order_by("enrollment_number")
        )

        rows = []
        for enr in prev_enr:
            truant = rng.random() < 0.09
            base_rate = 0.60 if truant else rng.uniform(0.87, 0.95)  # ~1-2pp abaixo de 2025
            for p in prev_periods:
                for k in range(5):
                    d = p.start_date + timedelta(days=k * 10)
                    rows.append(Attendance(
                        enrollment=enr, school_class_id=enr.school_class_id, date=d,
                        status="PRESENT" if rng.random() < base_rate else "ABSENT",
                    ))
        Attendance.objects.bulk_create(rows, batch_size=3000)

    def _seed_transfers(self, dept, year, classes):
        rng = self.rng
        schools = list({c.school for c in classes})
        students = list(
            Student.objects.filter(
                education_department=dept, unique_municipal_id__startswith=DEMO_ID_PREFIX
            )[:400]
        )
        if len(schools) < 2 or not students:
            return
        plan = (
            [TransferRequestStatus.PENDING_SME] * 34
            + [TransferRequestStatus.APPROVED_BY_SME] * 9
            + [TransferRequestStatus.ACCEPTED_BY_DESTINATION] * 18
            + [TransferRequestStatus.REJECTED] * 5
            + [TransferRequestStatus.CANCELLED] * 4
        )
        now = timezone.now()
        for status in plan:
            origin, dest = rng.sample(schools, 2)
            tr = TransferRequest.objects.create(
                student=rng.choice(students),
                origin_school=origin,
                destination_school=dest if status != TransferRequestStatus.PENDING_SME else None,
                academic_year=year,
                reason="Mudança de endereço da família.",
                status=status,
            )
            requested = now - timedelta(days=rng.randint(2, 90))
            resolved = None
            if status not in (TransferRequestStatus.PENDING_SME,):
                resolved = requested + timedelta(days=rng.randint(2, 14))
            TransferRequest.objects.filter(pk=tr.pk).update(
                requested_at=requested, resolved_at=resolved
            )

    # ------------------------------------------------------------------ #
    #  Utilitários                                                        #
    # ------------------------------------------------------------------ #

    def _birth_date(self, klass) -> date:
        stage = klass.curriculum_matrix.education_stage.stage_type
        base_age = {"INFANTIL": 4, "FUNDAMENTAL_I": 8, "FUNDAMENTAL_II": 13, "EJA": 22}.get(stage, 10)
        age = base_age + self.rng.randint(-1, 2)
        today = date.today()
        return date(today.year - age, self.rng.randint(1, 12), self.rng.randint(1, 28))

    def _next_seq(self, model, field, prefix) -> int:
        last = (
            model.objects.filter(**{f"{field}__startswith": prefix})
            .order_by(f"-{field}")
            .values_list(field, flat=True)
            .first()
        )
        if not last:
            return 1
        try:
            return int(last.replace(prefix, "")) + 1
        except ValueError:
            return 1

    def _report(self, dept, year):
        from apps.schools.models import School

        n_students = Student.objects.filter(
            education_department=dept, unique_municipal_id__startswith=DEMO_ID_PREFIX
        ).count()
        n_enr = Enrollment.objects.filter(
            enrollment_number__startswith=DEMO_ID_PREFIX, status=EnrollmentStatus.ENROLLED
        ).count()
        n_att = Attendance.objects.filter(
            enrollment__enrollment_number__startswith=DEMO_ID_PREFIX
        ).count()
        n_grade = Grade.objects.filter(
            enrollment__enrollment_number__startswith=DEMO_ID_PREFIX
        ).count()
        n_desc = DescriptiveEvaluation.objects.filter(
            enrollment__enrollment_number__startswith=DEMO_ID_PREFIX
        ).count()
        n_tr = TransferRequest.objects.filter(reason="Mudança de endereço da família.").count()
        self.stdout.write(self.style.SUCCESS("Carga de demonstração concluída"))
        self.stdout.write(f"  Alunos:         {n_students}")
        self.stdout.write(f"  Matrículas:     {n_enr}")
        self.stdout.write(f"  Frequência:     {n_att} registros")
        self.stdout.write(f"  Notas:          {n_grade}")
        self.stdout.write(f"  Pareceres:      {n_desc}")
        self.stdout.write(f"  Transferências: {n_tr}")
        self.stdout.write(
            "  Abra o dashboard como 'admin' (sme_admin) — todos os painéis devem preencher."
        )
