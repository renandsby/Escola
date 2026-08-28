"""Gateway ``/api/v1/sme/`` — agrega recursos de governança e de domínios vizinhos
(currículo, escolas, disciplinas, alocação docente, transferências) sob o prefixo
histórico consumido pelo painel da Secretaria. Contrato de URL congelado.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.curriculum.api.views import CurriculumMatrixViewSet, SubjectViewSet
from apps.schools.api.views import SchoolViewSet
from apps.students.api.views import TransferRequestViewSet
from apps.classes.api.views import TeacherAllocationViewSet, TeacherProfileViewSet

from .views import (
    AcademicPeriodViewSet,
    AcademicYearViewSet,
    EducationDepartmentViewSet,
    EducationStageViewSet,
)

router = DefaultRouter()
router.register('departments', EducationDepartmentViewSet, basename='sme-department')
router.register('academic-years', AcademicYearViewSet, basename='sme-academic-year')
router.register('academic-periods', AcademicPeriodViewSet, basename='sme-academic-period')
router.register('stages', EducationStageViewSet, basename='sme-education-stage')
router.register('curriculum-matrices', CurriculumMatrixViewSet, basename='sme-curriculum-matrix')
router.register('transfers', TransferRequestViewSet, basename='sme-transfer')
router.register('schools', SchoolViewSet, basename='sme-school')
router.register('subjects', SubjectViewSet, basename='sme-subject')
router.register('teachers/allocations', TeacherAllocationViewSet, basename='sme-teacher-allocation')
router.register('teachers', TeacherProfileViewSet, basename='sme-teacher')

urlpatterns = [
    path('', include(router.urls)),
]
