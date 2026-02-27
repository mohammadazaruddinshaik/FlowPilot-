import pandas as pd
from typing import List, Dict
from functools import reduce


# =====================================================
# EXCEPTION
# =====================================================

class FilterValidationError(Exception):
    pass


# =====================================================
# NORMALIZATION HELPERS
# =====================================================

def normalize_column_name(value: str) -> str:
    """
    Normalize column names safely.
    Handles:
    - None
    - BOM characters
    - whitespace
    - lowercase conversion
    """
    if not value:
        return ""

    return (
        str(value)
        .replace("\ufeff", "")  # Remove Excel BOM
        .strip()
        .lower()
    )


def normalize_schema(schema: List[dict]) -> Dict[str, str]:
    """
    Converts schema list into normalized dictionary:
    {
        "attendance": "number",
        "rollno": "string"
    }
    """

    if not isinstance(schema, list) or len(schema) == 0:
        raise FilterValidationError("Dataset schema is invalid or missing.")

    schema_map = {}

    for col in schema:
        if not isinstance(col, dict) or "name" not in col or "type" not in col:
            raise FilterValidationError("Invalid dataset schema structure.")

        name = normalize_column_name(col["name"])
        col_type = str(col["type"]).strip().lower()

        schema_map[name] = col_type

    return schema_map


# =====================================================
# FILTER DSL VALIDATION
# =====================================================

def validate_filter_dsl(filter_dsl: dict, schema: List[dict]) -> bool:
    """
    Validates filter DSL against dataset schema.

    Expected format:
    {
        "logic": "AND" | "OR",
        "conditions": [
            {
                "column": "attendance",
                "operator": "<",
                "value": 75
            }
        ]
    }
    """

    if not filter_dsl:
        return True

    if not isinstance(filter_dsl, dict):
        raise FilterValidationError("Filter must be a JSON object.")

    logic = filter_dsl.get("logic")
    conditions = filter_dsl.get("conditions")

    if logic not in ["AND", "OR"]:
        raise FilterValidationError("Filter logic must be 'AND' or 'OR'.")

    if not isinstance(conditions, list) or len(conditions) == 0:
        raise FilterValidationError("Filter must contain at least one condition.")

    schema_map = normalize_schema(schema)

    allowed_operators = ["==", "<", ">", "<=", ">=", "contains"]

    for condition in conditions:

        if not isinstance(condition, dict):
            raise FilterValidationError("Each condition must be an object.")

        raw_column = condition.get("column")
        operator = condition.get("operator")
        value = condition.get("value")

        column = normalize_column_name(raw_column)

        if not column:
            raise FilterValidationError("Condition missing 'column'.")

        if column not in schema_map:
            raise FilterValidationError(f"Invalid column '{raw_column}'.")

        if operator not in allowed_operators:
            raise FilterValidationError(
                f"Invalid operator '{operator}'. Allowed operators: {allowed_operators}"
            )

        if value is None:
            raise FilterValidationError(
                f"Condition for column '{raw_column}' must include a value."
            )

        column_type = schema_map[column]

        # Type validation
        if column_type == "number":
            try:
                float(value)
            except (ValueError, TypeError):
                raise FilterValidationError(
                    f"Column '{raw_column}' expects a numeric value."
                )

        if column_type == "string":
            if operator in ["<", ">", "<=", ">="]:
                raise FilterValidationError(
                    f"Operator '{operator}' not allowed for string column '{raw_column}'."
                )

    return True


# =====================================================
# APPLY FILTER (ROBUST + SAFE)
# =====================================================

def apply_filter(
    df: pd.DataFrame,
    filter_definition: Dict,
    schema: List[dict]
) -> pd.DataFrame:

    if not filter_definition:
        return df

    if schema is None:
        raise FilterValidationError("Schema is required for filtering.")

    validate_filter_dsl(filter_definition, schema)

    logic = filter_definition.get("logic")
    conditions = filter_definition.get("conditions")

    # Normalize dataframe columns (must match validator logic)
    df.columns = (
        df.columns
        .str.replace("\ufeff", "", regex=False)
        .str.strip()
        .str.lower()
    )

    query_parts = []

    for cond in conditions:

        column = normalize_column_name(cond.get("column"))
        operator = cond.get("operator")
        value = cond.get("value")

        if column not in df.columns:
            raise FilterValidationError(f"Invalid column '{column}'")

        series = df[column]

        if len(series) == 0:
            continue

        # Clean empty strings
        series = series.replace("", pd.NA)

        # Detect numeric
        numeric_series = pd.to_numeric(series, errors="coerce")
        numeric_ratio = numeric_series.notna().sum() / len(series)

        if numeric_ratio > 0.9:
            series = numeric_series
            try:
                value = float(value)
            except Exception:
                raise FilterValidationError(
                    f"Invalid numeric value for column '{column}'"
                )
        else:
            series = series.astype(str)
            value = str(value)

        # Apply operator
        if operator == "==":
            mask = series == value

        elif operator == "<":
            mask = series < value

        elif operator == ">":
            mask = series > value

        elif operator == "<=":
            mask = series <= value

        elif operator == ">=":
            mask = series >= value

        elif operator == "contains":
            if not pd.api.types.is_string_dtype(series):
                raise FilterValidationError(
                    f"'contains' only valid for string column '{column}'"
                )
            mask = series.str.contains(value, na=False)

        else:
            raise FilterValidationError(f"Unsupported operator '{operator}'")

        query_parts.append(mask)

    if not query_parts:
        return df

    if logic == "AND":
        final_mask = reduce(lambda x, y: x & y, query_parts)
    else:
        final_mask = reduce(lambda x, y: x | y, query_parts)

    return df[final_mask]