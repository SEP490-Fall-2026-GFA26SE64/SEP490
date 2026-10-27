"""One-time review-data conversion from legacy coverage to text instruction levels.

Future catalog records accept only the text enum; this does not score content.
"""
import math
from decimal import Decimal, ROUND_HALF_UP

INSTRUCTION_LEVELS = {'FOUNDATIONAL', 'INTERMEDIATE', 'ADVANCED'}

def convert_legacy_coverage(value):
    if type(value) not in (int,float) or not math.isfinite(value) or not 0<=value<=0.9:
        raise ValueError('Legacy coverage must be a finite number in [0,0.9]')
    rounded = Decimal(str(value)).quantize(Decimal('0.1'),rounding=ROUND_HALF_UP)
    if rounded<=Decimal('0.3'):return 'FOUNDATIONAL'
    if rounded<=Decimal('0.6'):return 'INTERMEDIATE'
    return 'ADVANCED'
