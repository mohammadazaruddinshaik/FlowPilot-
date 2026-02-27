# app/core/dataset_validator.py

from typing import Tuple, List, Dict
import difflib


# =====================================================
# Custom Exception
# =====================================================

class DatasetCompatibilityError(Exception):
    pass


# =====================================================
# Utilities
# =====================================================

def normalize_column(value: str) -> str:
    if not value:
        return ""
    return (
        str(value)
        .replace("\ufeff", "")
        .strip()
        .lower()
    )


def build_schema_map(dataset_schema: List[dict]) -> Dict[str, str]:
    """
    Converts schema list to:
    {
        "attendance": "number",
        "rollno": "string"
    }
    """
    schema_map = {}

    for col in dataset_schema:
        name = normalize_column(col.get("name"))
        col_type = col.get("type", "string")

        if name:
            schema_map[name] = col_type

    return schema_map


def suggest_column_name(column: str, available_columns: List[str]) -> str:
    """
    Suggest closest matching column name.
    """
    matches = difflib.get_close_matches(column, available_columns, n=1, cutoff=0.6)
    return matches[0] if matches else None


def validate_operator_datatype(column_type: str, operator: str) -> bool:
    """
    Numeric operators only allowed for numeric columns.
    """
    if operator in ["<", ">", "<=", ">="] and column_type != "number":
        return False
    return True


# =====================================================
# MAIN VALIDATION FUNCTION
# =====================================================

def validate_dataset_compatibility(
    template,
    dataset_schema: List[dict],
    recipient_column: str
) -> Tuple[bool, List[Dict]]:
    """
    Validates that:

    - recipient_column exists
    - template variables exist
    - filter DSL columns exist
    - filter operators match datatype

    Returns:
        (True, [])
        OR
        (False, [error objects])
    """

    errors = []

    if not dataset_schema:
        return False, [{
            "type": "invalid_schema",
            "message": "Dataset schema is empty or invalid."
        }]

    schema_map = build_schema_map(dataset_schema)
    schema_columns = list(schema_map.keys())

    # =====================================================
    # 1️⃣ Validate Recipient Column
    # =====================================================

    normalized_recipient = normalize_column(recipient_column)

    if normalized_recipient:
        if normalized_recipient not in schema_map:
            suggestion = suggest_column_name(normalized_recipient, schema_columns)

            errors.append({
                "type": "missing_recipient_column",
                "column": recipient_column,
                "suggestion": suggestion,
                "message": f"Recipient column '{recipient_column}' not found in dataset."
            })

    # =====================================================
    # 2️⃣ Validate Template Variables
    # =====================================================

    if template.variables:
        for var in template.variables:
            normalized_var = normalize_column(var)

            if normalized_var not in schema_map:
                suggestion = suggest_column_name(normalized_var, schema_columns)

                errors.append({
                    "type": "missing_template_variable",
                    "column": var,
                    "suggestion": suggestion,
                    "message": f"Template variable '{var}' missing in dataset."
                })

    # =====================================================
    # 3️⃣ Validate Filter DSL
    # =====================================================

    if template.filter_dsl:
        conditions = template.filter_dsl.get("conditions", [])

        for cond in conditions:
            raw_column = cond.get("column")
            operator = cond.get("operator")

            normalized_column = normalize_column(raw_column)

            # Column existence
            if normalized_column not in schema_map:
                suggestion = suggest_column_name(normalized_column, schema_columns)

                errors.append({
                    "type": "missing_filter_column",
                    "column": raw_column,
                    "suggestion": suggestion,
                    "message": f"Filter column '{raw_column}' missing in dataset."
                })
                continue

            # Datatype compatibility
            column_type = schema_map[normalized_column]

            if not validate_operator_datatype(column_type, operator):
                errors.append({
                    "type": "datatype_mismatch",
                    "column": raw_column,
                    "operator": operator,
                    "expected": "number",
                    "found": column_type,
                    "message": f"Operator '{operator}' requires numeric column for '{raw_column}'."
                })

    # =====================================================
    # FINAL RESULT
    # =====================================================

    if errors:
        return False, errors

    return True, []