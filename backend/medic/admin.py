from django.contrib import admin
from .models import MedicalReport, UserMedicalReport

# Register your models here.

admin.site.register(MedicalReport)
admin.site.register(UserMedicalReport)