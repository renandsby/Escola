from .academic_period import AcademicPeriod
from .academic_year import AcademicYear, AcademicYearStatus
from .education_department import EducationDepartment
from .education_stage import EducationStage, EvaluationType, StageType
from .privacy import CURRENT_TERM_VERSION, ConsentRecord, ConsentType

__all__ = [
    'EducationDepartment',
    'AcademicYear',
    'AcademicYearStatus',
    'AcademicPeriod',
    'EducationStage',
    'StageType',
    'EvaluationType',
    'ConsentRecord',
    'ConsentType',
    'CURRENT_TERM_VERSION',
]
