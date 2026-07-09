import os
import uuid
import hashlib
from io import BytesIO
from PIL import Image
from django.core.files.uploadedfile import InMemoryUploadedFile
from django.utils.text import slugify
from datetime import datetime, date


def generate_uuid():
    """Gera um UUID único."""
    return uuid.uuid4()


def generate_code(prefix='', length=8):
    """Gera um código único."""
    random_id = str(uuid.uuid4()).replace('-', '')[:length]
    return f"{prefix}{random_id}".upper()


def get_client_ip(request):
    """Obtém o IP real do cliente."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def resize_image(image, size=(800, 600)):
    """Redimensiona uma imagem."""
    img = Image.open(image)
    img.thumbnail(size, Image.Resampling.LANCZOS)

    output = BytesIO()
    img.save(output, format='JPEG', quality=85)
    output.seek(0)

    return InMemoryUploadedFile(
        output,
        'ImageField',
        f"{image.name.split('.')[0]}_resized.jpg",
        'image/jpeg',
        output.getbuffer().nbytes,
        None,
    )


def slugify_text(text):
    """Converte texto em slug."""
    return slugify(text)


def calculate_age(birth_date):
    """Calcula a idade baseada na data de nascimento."""
    today = date.today()
    return today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))


def format_cpf(cpf):
    """Formata CPF."""
    cpf_str = str(cpf).zfill(11)
    return f"{cpf_str[:3]}.{cpf_str[3:6]}.{cpf_str[6:9]}-{cpf_str[9:]}"


def validate_cpf(cpf):
    """Valida CPF."""
    cpf_str = ''.join(filter(str.isdigit, str(cpf)))

    if len(cpf_str) != 11:
        return False

    if cpf_str == cpf_str[0] * 11:
        return False

    sum1 = sum(int(cpf_str[i]) * (10 - i) for i in range(9))
    remainder1 = sum1 % 11
    digit1 = 0 if remainder1 < 2 else 11 - remainder1

    sum2 = sum(int(cpf_str[i]) * (11 - i) for i in range(10))
    remainder2 = sum2 % 11
    digit2 = 0 if remainder2 < 2 else 11 - remainder2

    return digit1 == int(cpf_str[9]) and digit2 == int(cpf_str[10])


def generate_hash(text):
    """Gera hash SHA256."""
    return hashlib.sha256(text.encode()).hexdigest()
