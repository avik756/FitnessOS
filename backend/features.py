"""Body, food, calendar, and reusable workout data for the local app."""

import sqlite3
from contextlib import closing
from datetime import date, datetime, timezone
from decimal import Decimal, InvalidOperation


MEASURES = ("waist", "chest", "hips", "arm", "thigh")


def ensure_schema(connection):
    connection.executescript("""
        CREATE TABLE IF NOT EXISTS profile (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            height_cm TEXT,
            age_years INTEGER,
            formula_variant TEXT
        );
        CREATE TABLE IF NOT EXISTS body_entries (
            id INTEGER PRIMARY KEY,
            activity_date TEXT NOT NULL,
            weight TEXT,
            weight_unit TEXT NOT NULL,
            body_fat_pct TEXT,
            waist TEXT, chest TEXT, hips TEXT, arm TEXT, thigh TEXT,
            measure_unit TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS calorie_entries (
            id INTEGER PRIMARY KEY,
            activity_date TEXT NOT NULL,
            label TEXT NOT NULL,
            kcal INTEGER NOT NULL,
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS custom_exercises (
            name TEXT PRIMARY KEY COLLATE NOCASE
        );
        CREATE TABLE IF NOT EXISTS workouts (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL UNIQUE COLLATE NOCASE
        );
        CREATE TABLE IF NOT EXISTS plan_days (
            id INTEGER PRIMARY KEY,
            workout_id INTEGER NOT NULL REFERENCES workouts(id),
            name TEXT NOT NULL COLLATE NOCASE,
            UNIQUE(workout_id, name)
        );
        CREATE TABLE IF NOT EXISTS day_exercises (
            id INTEGER PRIMARY KEY,
            day_id INTEGER NOT NULL REFERENCES plan_days(id),
            exercise TEXT NOT NULL,
            position INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS body_date_idx ON body_entries(activity_date);
        CREATE INDEX IF NOT EXISTS calorie_date_idx ON calorie_entries(activity_date);
    """)
    columns = {row[1] for row in connection.execute('PRAGMA table_info(calorie_entries)')}
    if 'meal_time' not in columns:
        connection.execute('ALTER TABLE calorie_entries ADD COLUMN meal_time TEXT')


def db(database):
    connection = sqlite3.connect(database)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    ensure_schema(connection)
    return connection


def valid_date(value):
    if not isinstance(value, str):
        raise ValueError("Choose a valid date.")
    try:
        if date.fromisoformat(value).isoformat() != value:
            raise ValueError
    except ValueError:
        raise ValueError("Choose a valid date.") from None
    return value


def number(value, label, maximum, required=False, positive=False):
    if value is None or value == "":
        if required:
            raise ValueError(f"Enter {label}.")
        return None
    try:
        result = Decimal(str(value))
    except (InvalidOperation, TypeError):
        raise ValueError(f"Enter a valid {label}.") from None
    if not result.is_finite() or (result <= 0 if positive else result < 0) or result > maximum:
        raise ValueError(f"{label.capitalize()} is outside the supported range.")
    return str(result)


def name(value, label, limit=80):
    if not isinstance(value, str) or not 1 <= len(value.strip()) <= limit:
        raise ValueError(f"Enter {label} (up to {limit} characters).")
    return value.strip()


def validate_body(data):
    if not isinstance(data, dict):
        raise ValueError("Send a body entry as an object.")
    day = valid_date(data.get("activity_date"))
    weight_unit = data.get("weight_unit")
    measure_unit = data.get("measure_unit")
    if weight_unit not in ("kg", "lb") or measure_unit not in ("cm", "in"):
        raise ValueError("Choose weight and measurement units.")
    values = [number(data.get("weight"), "weight", 1500, positive=True), number(data.get("body_fat_pct"), "body fat percentage", 100)]
    values += [number(data.get(key), key, 500, positive=True) for key in MEASURES]
    if all(value is None for value in values):
        raise ValueError("Enter at least one body measurement.")
    return (day, values[0], weight_unit, values[1], *values[2:], measure_unit)


def save_body(data, database):
    values = validate_body(data)
    with closing(db(database)) as connection:
        with connection:
            cursor = connection.execute("""INSERT INTO body_entries
                (activity_date, weight, weight_unit, body_fat_pct, waist, chest, hips, arm, thigh, measure_unit, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""", (*values, datetime.now(timezone.utc).isoformat()))
            row = connection.execute("SELECT * FROM body_entries WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return dict(row)


def list_body(database):
    with closing(db(database)) as connection:
        return [dict(row) for row in connection.execute("SELECT * FROM body_entries ORDER BY activity_date DESC, id DESC")]


def validate_profile(data):
    if not isinstance(data, dict):
        raise ValueError("Send profile details as an object.")
    height = number(data.get("height_cm"), "height in cm", 300, positive=True)
    age = data.get("age_years")
    if age in (None, ""):
        age = None
    elif type(age) is not int or not 20 <= age <= 120:
        raise ValueError("For an adult estimate, enter an age from 20 to 120.")
    variant = data.get("formula_variant") or None
    if variant not in (None, "male", "female"):
        raise ValueError("Choose a formula variant or leave it blank.")
    return (height, age, variant)


def save_profile(data, database):
    values = validate_profile(data)
    with closing(db(database)) as connection:
        with connection:
            connection.execute("INSERT OR REPLACE INTO profile (id, height_cm, age_years, formula_variant) VALUES (1, ?, ?, ?)", values)
    return get_profile(database)


def get_profile(database):
    with closing(db(database)) as connection:
        row = connection.execute("SELECT height_cm, age_years, formula_variant FROM profile WHERE id = 1").fetchone()
    return dict(row) if row else {"height_cm": None, "age_years": None, "formula_variant": None}


def validate_calories(data):
    if not isinstance(data, dict):
        raise ValueError("Send a calorie entry as an object.")
    day = valid_date(data.get("activity_date"))
    label = name(data.get("label"), "a food or meal label", 240)
    kcal = data.get("kcal")
    if type(kcal) is not int or not 0 <= kcal <= 20000:
        raise ValueError("Calories must be a whole number from 0 to 20000.")
    meal_time = data.get('meal_time') or None
    if meal_time is not None:
        try:
            if not isinstance(meal_time, str) or len(meal_time) != 5:
                raise ValueError
            datetime.strptime(meal_time, '%H:%M')
        except ValueError:
            raise ValueError('Choose a valid meal time.') from None
    return day, label, kcal, meal_time


def save_calories(data, database):
    values = validate_calories(data)
    with closing(db(database)) as connection:
        with connection:
            cursor = connection.execute("INSERT INTO calorie_entries (activity_date, label, kcal, meal_time, created_at) VALUES (?, ?, ?, ?, ?)", (*values, datetime.now(timezone.utc).isoformat()))
            row = connection.execute("SELECT * FROM calorie_entries WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return dict(row)


def list_calories(database):
    with closing(db(database)) as connection:
        return [dict(row) for row in connection.execute("SELECT * FROM calorie_entries ORDER BY activity_date DESC, id DESC")]


def make(data, kind, database):
    if not isinstance(data, dict):
        raise ValueError("Send details as an object.")
    try:
        with closing(db(database)) as connection, connection:
            if kind == "exercise":
                value = name(data.get("name"), "an exercise name")
                connection.execute("INSERT INTO custom_exercises (name) VALUES (?)", (value,))
            elif kind == "workout":
                value = name(data.get("name"), "a workout name")
                connection.execute("INSERT INTO workouts (name) VALUES (?)", (value,))
            elif kind == "day":
                value = name(data.get("name"), "a day name")
                parent = data.get("workout_id")
                if type(parent) is not int or not connection.execute("SELECT 1 FROM workouts WHERE id = ?", (parent,)).fetchone():
                    raise ValueError("Choose a saved workout.")
                connection.execute("INSERT INTO plan_days (workout_id, name) VALUES (?, ?)", (parent, value))
            elif kind == "day-exercise":
                value = name(data.get("exercise"), "an exercise name")
                parent = data.get("day_id")
                if type(parent) is not int or not connection.execute("SELECT 1 FROM plan_days WHERE id = ?", (parent,)).fetchone():
                    raise ValueError("Choose a saved day.")
                position = connection.execute("SELECT COUNT(*) FROM day_exercises WHERE day_id = ?", (parent,)).fetchone()[0]
                connection.execute("INSERT INTO day_exercises (day_id, exercise, position) VALUES (?, ?, ?)", (parent, value, position))
            else:
                raise ValueError("Unknown item to make.")
    except sqlite3.IntegrityError:
        raise ValueError("That name already exists in this workout or exercise library.") from None
    return get_plans(database)


def get_plans(database):
    with closing(db(database)) as connection:
        exercises = [row["name"] for row in connection.execute("SELECT name FROM custom_exercises ORDER BY name COLLATE NOCASE")]
        workouts = [dict(row) for row in connection.execute("SELECT * FROM workouts ORDER BY id")]
        days = [dict(row) for row in connection.execute("SELECT * FROM plan_days ORDER BY id")]
        items = [dict(row) for row in connection.execute("SELECT * FROM day_exercises ORDER BY day_id, position, id")]
    for workout in workouts:
        workout["days"] = [day for day in days if day["workout_id"] == workout["id"]]
        for day in workout["days"]:
            day["exercises"] = [item["exercise"] for item in items if item["day_id"] == day["id"]]
    return {"exercises": exercises, "workouts": workouts}


def calendar_month(month, database):
    if not isinstance(month, str) or len(month) != 7 or month[4] != "-":
        raise ValueError("Choose a valid month.")
    try:
        date.fromisoformat(month + "-01")
    except ValueError:
        raise ValueError("Choose a valid month.") from None
    days = {}
    with closing(db(database)) as connection:
        for table, key in (("sets", "sets"), ("body_entries", "body"), ("calorie_entries", "calories")):
            for row in connection.execute(f"SELECT activity_date, COUNT(*) AS count FROM {table} WHERE activity_date LIKE ? GROUP BY activity_date", (month + "-%",)):
                days.setdefault(row["activity_date"], {"sets": 0, "body": 0, "calories": 0})[key] = row["count"]
    return days


def calendar_day(day, database):
    valid_date(day)
    with closing(db(database)) as connection:
        sets = [dict(row) for row in connection.execute("SELECT * FROM sets WHERE activity_date = ? ORDER BY id DESC", (day,))]
        body = [dict(row) for row in connection.execute("SELECT * FROM body_entries WHERE activity_date = ? ORDER BY id DESC", (day,))]
        calories = [dict(row) for row in connection.execute("SELECT * FROM calorie_entries WHERE activity_date = ? ORDER BY id DESC", (day,))]
    return {"date": day, "sets": sets, "body": body, "calories": calories}


def weight_kg(row):
    if row["weight"] is None:
        return None
    value = Decimal(row["weight"])
    return value if row["weight_unit"] == "kg" else value * Decimal("0.45359237")


def body_stats(database):
    rows = list_body(database)
    profile = get_profile(database)
    recent_weights = [weight_kg(row) for row in rows if row["weight"] is not None][:7]
    latest_weight = next((row for row in rows if row["weight"] is not None), None)
    latest_fat = next((row for row in rows if row["body_fat_pct"] is not None), None)
    bmi = rmr = None
    if latest_weight and profile["height_cm"]:
        kg = weight_kg(latest_weight)
        cm = Decimal(profile["height_cm"])
        bmi = round(float(kg / ((cm / 100) ** 2)), 1)
        if profile["age_years"] and profile["age_years"] <= 78 and profile["formula_variant"]:
            constant = 5 if profile["formula_variant"] == "male" else -161
            rmr = round(float(10 * kg + Decimal("6.25") * cm - 5 * profile["age_years"] + constant))
    return {"latest_weight": latest_weight, "latest_body_fat": latest_fat, "bmi": bmi, "rmr_kcal": rmr,
            "weight_count": sum(row["weight"] is not None for row in rows),
            "recent_weight_average_kg": round(float(sum(recent_weights) / len(recent_weights)), 1) if recent_weights else None,
            "recent_weight_change_kg": round(float(recent_weights[0] - recent_weights[-1]), 1) if len(recent_weights) > 1 else None}


def export_extra(database):
    with closing(db(database)) as connection:
        body = [dict(row) for row in connection.execute("""SELECT activity_date, weight, weight_unit, body_fat_pct,
            waist, chest, hips, arm, thigh, measure_unit FROM body_entries ORDER BY id""")]
        calories = [dict(row) for row in connection.execute("SELECT activity_date, label, kcal, meal_time FROM calorie_entries ORDER BY id")]
    plans = get_plans(database)
    return {"profile": get_profile(database), "body": body, "calories": calories,
            "custom_exercises": plans["exercises"],
            "workouts": [{"name": workout["name"], "days": [
                {"name": day["name"], "exercises": day["exercises"]} for day in workout["days"]
            ]} for workout in plans["workouts"]]}


def validate_extra(data):
    profile = validate_profile(data.get("profile", {}))
    body = data.get("body")
    calories = data.get("calories")
    exercises = data.get("custom_exercises")
    workouts = data.get("workouts")
    if not isinstance(body, list) or len(body) > 10000 or not isinstance(calories, list) or len(calories) > 10000:
        raise ValueError("Backup body or calorie entries are invalid.")
    if not isinstance(exercises, list) or len(exercises) > 1000 or not isinstance(workouts, list) or len(workouts) > 1000:
        raise ValueError("Backup plans are invalid.")
    clean_exercises = [name(value, "an exercise name") for value in exercises]
    if len({item.casefold() for item in clean_exercises}) != len(clean_exercises):
        raise ValueError("Backup has duplicate exercises.")
    clean_workouts = []
    for workout in workouts:
        if not isinstance(workout, dict) or not isinstance(workout.get("days"), list) or len(workout["days"]) > 1000:
            raise ValueError("Backup workouts are invalid.")
        days = []
        for day in workout["days"]:
            if not isinstance(day, dict) or not isinstance(day.get("exercises"), list) or len(day["exercises"]) > 1000:
                raise ValueError("Backup days are invalid.")
            days.append((name(day.get("name"), "a day name"),
                         [name(item, "an exercise name") for item in day["exercises"]]))
        if len({day[0].casefold() for day in days}) != len(days):
            raise ValueError("Backup has duplicate days.")
        clean_workouts.append((name(workout.get("name"), "a workout name"), days))
    if len({workout[0].casefold() for workout in clean_workouts}) != len(clean_workouts):
        raise ValueError("Backup has duplicate workouts.")
    return {"profile": profile, "body": [validate_body(row) for row in body],
            "calories": [validate_calories(row) for row in calories],
            "exercises": clean_exercises, "workouts": clean_workouts}


def existing_extra(connection):
    return sum(connection.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0] for table in
               ("body_entries", "calorie_entries", "custom_exercises", "workouts", "plan_days", "day_exercises", "profile"))


def restore_extra(connection, extra, created_at):
    height, age, variant = extra["profile"]
    if any(value is not None for value in (height, age, variant)):
        connection.execute("INSERT INTO profile (id, height_cm, age_years, formula_variant) VALUES (1, ?, ?, ?)", (height, age, variant))
    connection.executemany("""INSERT INTO body_entries
        (activity_date, weight, weight_unit, body_fat_pct, waist, chest, hips, arm, thigh, measure_unit, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""", [(*row, created_at) for row in extra["body"]])
    connection.executemany("INSERT INTO calorie_entries (activity_date, label, kcal, meal_time, created_at) VALUES (?, ?, ?, ?, ?)",
                           [(*row, created_at) for row in extra["calories"]])
    connection.executemany("INSERT INTO custom_exercises (name) VALUES (?)", [(item,) for item in extra["exercises"]])
    for workout_name, days in extra["workouts"]:
        workout_id = connection.execute("INSERT INTO workouts (name) VALUES (?)", (workout_name,)).lastrowid
        for day_name, exercises in days:
            day_id = connection.execute("INSERT INTO plan_days (workout_id, name) VALUES (?, ?)", (workout_id, day_name)).lastrowid
            connection.executemany("INSERT INTO day_exercises (day_id, exercise, position) VALUES (?, ?, ?)",
                                   [(day_id, exercise, position) for position, exercise in enumerate(exercises)])
