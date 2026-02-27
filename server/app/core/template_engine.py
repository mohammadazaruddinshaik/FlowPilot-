# app/core/template_engine.py

import re
from typing import List, Dict, Tuple


# =====================================================
# Custom Exception
# =====================================================

class TemplateValidationError(Exception):
    pass


# =====================================================
# REGEX (Precompiled)
# =====================================================

VARIABLE_PATTERN = re.compile(r"\{\{\s*([a-zA-Z0-9_]+)\s*\}\}")


# =====================================================
# UTILITIES
# =====================================================

def normalize_key(value: str) -> str:
    if not value:
        return ""
    return (
        str(value)
        .replace("\ufeff", "")
        .strip()
        .lower()
    )


# =====================================================
# EXTRACT VARIABLES
# =====================================================

def extract_variables(template: str) -> List[str]:
    """
    Extract unique normalized variables from template.
    """

    if not template or not template.strip():
        raise TemplateValidationError("Template cannot be empty.")

    matches = VARIABLE_PATTERN.findall(template)

    seen = set()
    unique_vars = []

    for var in matches:
        normalized = normalize_key(var)

        if normalized and normalized not in seen:
            seen.add(normalized)
            unique_vars.append(normalized)

    return unique_vars


# =====================================================
# VALIDATE TEMPLATE AGAINST SCHEMA
# =====================================================

def validate_template(
    template: str,
    schema: List[Dict]
) -> Tuple[bool, List[str]]:
    """
    Validates that template variables exist in schema.

    Returns:
        (True, [])
        OR
        (False, [missing variables])
    """

    variables = extract_variables(template)

    if not variables:
        return True, []

    schema_fields = {
        normalize_key(col.get("name"))
        for col in schema
        if col.get("name")
    }

    missing = [
        var for var in variables
        if var not in schema_fields
    ]

    if missing:
        return False, missing

    return True, []


# =====================================================
# STRICT RENDER TEMPLATE
# =====================================================

def render_template(
    template: str,
    row: Dict,
    strict: bool = False
) -> str:
    """
    Render template with row data.

    strict=True:
        - Raises error if variable missing in row

    strict=False:
        - Replaces missing variable with empty string
    """

    if not template:
        return ""

    if not isinstance(row, dict):
        raise TemplateValidationError("Row data must be a dictionary.")

    # Normalize row keys once
    normalized_row = {
        normalize_key(k): v
        for k, v in row.items()
    }

    def replace_match(match):
        key = normalize_key(match.group(1))

        if key not in normalized_row:
            if strict:
                raise TemplateValidationError(
                    f"Missing value for variable '{key}' in row."
                )
            return ""

        value = normalized_row.get(key)

        if value is None:
            return ""

        return str(value)

    try:
        rendered = VARIABLE_PATTERN.sub(replace_match, template)
    except TemplateValidationError:
        raise
    except Exception as e:
        raise TemplateValidationError(f"Template rendering failed: {str(e)}")

    return rendered.strip()


# =====================================================
# SAFE RENDER WITH VALIDATION
# =====================================================

def safe_render_template(
    template: str,
    row: Dict
) -> Tuple[bool, str, str]:
    """
    Safe wrapper for execution engine.

    Returns:
        (success, rendered_message, error_message)
    """

    try:
        rendered = render_template(template, row, strict=True)

        if not rendered:
            return False, "", "Rendered message is empty."

        return True, rendered, None

    except TemplateValidationError as e:
        return False, "", str(e)

    except Exception as e:
        return False, "", f"Unexpected template error: {str(e)}"