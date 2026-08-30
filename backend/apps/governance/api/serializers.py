from rest_framework import serializers

from apps.governance.models import (
    AcademicPeriod,
    AcademicYear,
    AcademicYearStatus,
    EducationDepartment,
    EducationStage,
)


class EducationDepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = EducationDepartment
        fields = [
            'id',
            'municipality_name',
            'ibge_code',
            'secretary_name',
            'min_passing_grade',
            'min_attendance_percentage',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class EducationDepartmentListSerializer(serializers.ModelSerializer):
    class Meta:
        model = EducationDepartment
        fields = [
            'id',
            'municipality_name',
            'ibge_code',
            'is_active',
        ]


class AcademicYearSerializer(serializers.ModelSerializer):
    education_department_name = serializers.CharField(
        source='education_department.municipality_name',
        read_only=True,
    )
    periods_count = serializers.IntegerField(source='periods.count', read_only=True)

    class Meta:
        model = AcademicYear
        fields = [
            'id',
            'education_department',
            'education_department_name',
            'year',
            'status',
            'start_date',
            'end_date',
            'periods_count',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def _effective(self, data, field):
        """Valor pós-update: usa o payload e cai para o da instância (PATCH)."""
        if field in data:
            return data[field]
        return getattr(self.instance, field, None)

    def validate(self, data):
        if self.instance and self.instance.status == AcademicYearStatus.CLOSED:
            raise serializers.ValidationError(
                'Ano letivo encerrado não pode ser editado.'
            )

        start_date = self._effective(data, 'start_date')
        end_date = self._effective(data, 'end_date')
        year = self._effective(data, 'year')

        if start_date and end_date and start_date >= end_date:
            raise serializers.ValidationError(
                {'end_date': 'Data de término deve ser posterior à data de início.'}
            )

        if start_date and year and start_date.year != year:
            raise serializers.ValidationError(
                {'start_date': f'Data de início deve estar no ano {year}.'}
            )

        return data


class AcademicYearListSerializer(serializers.ModelSerializer):
    periods_count = serializers.IntegerField(source='periods.count', read_only=True)

    class Meta:
        model = AcademicYear
        fields = [
            'id',
            'year',
            'status',
            'education_department',
            'start_date',
            'end_date',
            'periods_count',
            'is_active',
        ]


class AcademicPeriodSerializer(serializers.ModelSerializer):
    academic_year_label = serializers.IntegerField(source='academic_year.year', read_only=True)

    class Meta:
        model = AcademicPeriod
        fields = [
            'id',
            'academic_year',
            'academic_year_label',
            'name',
            'period_number',
            'start_date',
            'end_date',
            'grade_deadline',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
        # A unicidade (ano + número) é validada em ``validate`` com erro por campo.
        validators = []

    def _effective(self, data, field):
        if field in data:
            return data[field]
        return getattr(self.instance, field, None)

    def validate_academic_year(self, value):
        if value.status == AcademicYearStatus.CLOSED:
            raise serializers.ValidationError(
                'O ano letivo está encerrado — não aceita novos períodos.'
            )
        return value

    def validate(self, data):
        academic_year = self._effective(data, 'academic_year')
        if (
            self.instance
            and self.instance.academic_year.status == AcademicYearStatus.CLOSED
        ):
            raise serializers.ValidationError(
                'Período de ano letivo encerrado não pode ser editado.'
            )

        start_date = self._effective(data, 'start_date')
        end_date = self._effective(data, 'end_date')
        grade_deadline = self._effective(data, 'grade_deadline')
        period_number = self._effective(data, 'period_number')

        if start_date and end_date and start_date >= end_date:
            raise serializers.ValidationError(
                {'end_date': 'Data de término deve ser posterior à data de início.'}
            )

        if end_date and grade_deadline and grade_deadline < end_date:
            raise serializers.ValidationError(
                {
                    'grade_deadline': (
                        'Prazo de lançamento deve ser igual ou posterior ao '
                        'término do período.'
                    )
                }
            )

        if academic_year and start_date and start_date < academic_year.start_date:
            raise serializers.ValidationError(
                {'start_date': 'Data de início deve estar dentro do ano letivo.'}
            )
        if academic_year and end_date and end_date > academic_year.end_date:
            raise serializers.ValidationError(
                {'end_date': 'Data de término deve estar dentro do ano letivo.'}
            )

        if academic_year and period_number is not None:
            clash = (
                AcademicPeriod.objects.filter(
                    academic_year=academic_year,
                    period_number=period_number,
                )
                .exclude(pk=self.instance.pk if self.instance else None)
                .exists()
            )
            if clash:
                raise serializers.ValidationError(
                    {
                        'period_number': (
                            f'Já existe um período nº {period_number} neste ano letivo.'
                        )
                    }
                )

        return data


class AcademicPeriodListSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicPeriod
        fields = [
            'id',
            'name',
            'period_number',
            'academic_year',
            'start_date',
            'end_date',
            'grade_deadline',
        ]


class EducationStageSerializer(serializers.ModelSerializer):
    class Meta:
        model = EducationStage
        fields = [
            'id',
            'name',
            'code',
            'stage_type',
            'evaluation_type',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
