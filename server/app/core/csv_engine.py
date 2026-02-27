# app/core/csv_engine.py

import os
import pandas as pd
from typing import Dict, Any


class CSVParseError(Exception):
    pass


def parse_csv(file_path: str) -> Dict[str, Any]:
    """
    Safely parse CSV file.
    Returns:
        {
            row_count,
            schema,
            sample_rows,
            dataframe
        }
    """

    if not os.path.exists(file_path):
        raise CSVParseError("CSV file not found.")

    try:
        df = pd.read_csv(file_path, dtype=str, encoding="utf-8")
    except UnicodeDecodeError:
        try:
            df = pd.read_csv(file_path, dtype=str, encoding="latin1")
        except Exception:
            raise CSVParseError("Failed to read CSV file due to encoding issues.")
    except Exception as e:
        raise CSVParseError(f"CSV parsing failed: {str(e)}")

    if df.empty:
        raise CSVParseError("Uploaded CSV file is empty.")

    # =====================================================
    # Normalize Columns (OPTION A — SYSTEM WIDE STANDARD)
    # =====================================================

    df.columns = (
        df.columns
        .str.strip()
        .str.lower()
    )

    # Prevent case-collision duplicates
    if len(df.columns) != len(set(df.columns)):
        raise CSVParseError(
            "CSV contains duplicate column names after normalization."
        )

    # Normalize cell values
    df = df.fillna("")
    df = df.applymap(lambda x: x.strip() if isinstance(x, str) else x)

    row_count = len(df)

    # =====================================================
    # Schema Detection
    # =====================================================

    schema = []

    for column in df.columns:
        series = df[column]

        # If column fully empty
        if series.eq("").all():
            col_type = "string"
        else:
            # Attempt numeric detection
            numeric_series = pd.to_numeric(series, errors="coerce")

            # If most values numeric → treat as number
            non_null_ratio = numeric_series.notna().sum() / len(series)

            col_type = "number" if non_null_ratio > 0.9 else "string"

        schema.append({
            "name": column,
            "type": col_type
        })

    sample_rows = df.head(5).to_dict(orient="records")

    return {
        "row_count": row_count,
        "schema": schema,
        "sample_rows": sample_rows,
        "dataframe": df
    }