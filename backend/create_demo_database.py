"""Create an isolated, fictional month of FitnessOS records for manual UI testing.

Run from the repository root: python -m backend.create_demo_database
The output is ignored by Git. Existing databases are never overwritten.
"""
import argparse
import random
import sqlite3
from datetime import date, datetime, timedelta
from pathlib import Path

from backend import app, features, journal


DEFAULT = Path('databases/fitnessos-demo-month.sqlite3')
DEMO_NAME = 'Demo Athlete'
DEMO_PASSWORD = 'DemoPass123!'


def populate(database: Path):
    if database.exists():
        raise FileExistsError(f'{database} already exists; choose another path to keep it intact.')
    database.parent.mkdir(parents=True, exist_ok=True)
    rng = random.Random(20261120)
    app.create_account({'name': DEMO_NAME, 'password': DEMO_PASSWORD, 'remember': False}, database)
    features.save_profile({'height_cm': '176', 'age_years': 28, 'formula_variant': None}, database)

    routine = features.make({'name': 'Four-day strength rotation'}, 'workout', database)
    workout_id = routine['workouts'][0]['id']
    days = [
        ('Upper A', [('Bench Press', 55, 8), ('Seated Cable Row', 47.5, 10),
                     ('Incline Dumbbell Press', 20, 10), ('Lat Pulldown', 50, 10)]),
        ('Lower A', [('Barbell Squat', 65, 7), ('Romanian Deadlift', 60, 9),
                     ('Leg Press', 125, 10), ('Standing Calf Raise', 45, 12)]),
        ('Upper B', [('Overhead Press', 32.5, 7), ('Assisted Pull-Up', 25, 8),
                     ('Dumbbell Lateral Raise', 8, 13), ('Cable Triceps Pushdown', 22.5, 11)]),
        ('Lower B', [('Goblet Squat', 26, 10), ('Hip Thrust', 70, 10),
                     ('Walking Lunge', 14, 10), ('Leg Curl', 35, 12)]),
    ]
    ids = []
    for title, exercises in days:
        plan = features.make({'name': title, 'workout_id': workout_id}, 'day', database)
        day_id = next(item['id'] for item in plan['workouts'][0]['days'] if item['name'] == title)
        ids.append(day_id)
        for exercise, _, _ in exercises:
            features.make({'day_id': day_id, 'exercise': exercise}, 'day-exercise', database)
    for exercise in ('Bench Press', 'Barbell Squat', 'Seated Cable Row', 'Overhead Press'):
        app.set_favorite({'exercise': exercise, 'favorite': True}, database)

    foods = [
        ('Oats with milk and banana', 390, 16, 61, 10),
        ('Eggs and toast', 420, 27, 33, 19),
        ('Paneer and roti', 640, 32, 58, 31),
        ('Dal, rice and vegetables', 590, 21, 93, 13),
        ('Chicken rice bowl', 710, 45, 82, 19),
        ('Curd, fruit and nuts', 330, 17, 35, 15),
        ('Vegetable poha', 380, 9, 62, 10),
        ('Sandwich and fruit', 490, 23, 62, 16),
    ]
    # A real personal food library, separate from the meals that were logged.
    for name, kcal, protein, carbs, fat in foods[:6]:
        journal.save('food', {'name': name, 'portion': 'one measured serving', 'kcal': kcal,
                             'nutrition': {'source': 'Fictional recipe estimate', 'protein': protein,
                                           'carbs': carbs, 'fat': fat}}, database)

    start = date(2026, 10, 21)
    workout_index = 0
    for offset in range(30):
        day = start + timedelta(days=offset)
        day_text = day.isoformat()
        # 4 sessions most weeks, with an occasional missed day.
        train = day.weekday() in (0, 1, 3, 5) and offset not in (10, 23)
        if train:
            slot = workout_index % len(days)
            session = journal.start_workout({'day_id': ids[slot], 'activity_date': day_text}, database)
            for position, (exercise, base, reps) in enumerate(days[slot][1]):
                for number in range(3):
                    load = base + min(workout_index // 5, 2) * (1 if base < 40 else 2.5)
                    if number == 2 and exercise in ('Bench Press', 'Barbell Squat', 'Overhead Press'):
                        load -= 2.5
                    app.save_set({'activity_date': day_text, 'exercise': exercise,
                                  'reps': max(4, reps - number + rng.choice((-1, 0, 0, 1))),
                                  'load': str(round(load, 2)), 'unit': 'kg', 'load_type': 'total',
                                  'session_id': session['id'], 'session_exercise': position}, database)
            journal.update_state(database, session['id'], 'workout')
            workout_index += 1

        if offset % 4 != 1:
            for meal, clock in ((foods[(offset * 3) % len(foods)], '09:10'),
                                (foods[(offset * 5 + 3) % len(foods)], '13:20'),
                                (foods[(offset * 7 + 2) % len(foods)], '20:10')):
                label, kcal, protein, carbs, fat = meal
                portions = rng.choice((0.9, 1, 1, 1.1))
                features.save_calories({'activity_date': day_text, 'label': label,
                    'kcal': round(kcal * portions), 'meal_time': clock,
                    'nutrition': {'source': 'Fictional recipe estimate',
                                  'protein': round(protein * portions, 1),
                                  'carbs': round(carbs * portions, 1), 'fat': round(fat * portions, 1)}}, database)
        if offset % 3 != 2:
            journal.save('steps', {'activity_date': day_text,
                                   'count': rng.randint(4200, 11500) + (2200 if train else 0)}, database)
        if offset % 4 != 0:
            # An overnight log belongs to its wake-up date.
            bedtime = datetime.combine(day - timedelta(days=1), datetime.min.time()).replace(hour=23, minute=10)
            bedtime += timedelta(minutes=rng.choice((-25, -10, 0, 15, 30)))
            wake = bedtime + timedelta(hours=7, minutes=rng.choice((0, 20, 35, 50)))
            journal.save('sleep', {'activity_date': day_text, 'start': bedtime.strftime('%Y-%m-%dT%H:%M'),
                                   'end': wake.strftime('%Y-%m-%dT%H:%M'),
                                   'quality': rng.choice((3, 3, 4, 4, 5))}, database)
        if offset % 5 != 3:
            for clock, ml in (('10:30', 350), ('15:00', 500), ('19:15', rng.choice((300, 400, 500)))):
                journal.save('water', {'activity_date': day_text, 'time': clock, 'ml': ml}, database)
        if offset % 3 == 0:
            journal.save('checkin', {'activity_date': day_text, 'time': '21:30',
                'mood': rng.choice((3, 4, 4, 5)), 'energy': rng.choice((2, 3, 3, 4)),
                'bloating': rng.choice((0, 0, 1, 2)),
                'notes': rng.choice(('Busy day, training felt steady.', 'Good appetite today.',
                                     'A little tired after lectures.', 'Relaxed evening.'))}, database)
        if offset % 5 == 0:
            features.save_body({'activity_date': day_text, 'weight': str(round(82.6 - offset * .065 + rng.uniform(-.3, .3), 1)),
                'weight_unit': 'kg', 'measure_unit': 'cm',
                'waist': str(round(89 - offset * .035 + rng.uniform(-.3, .3), 1)),
                'chest': '101', 'hips': '99', 'arm': '33', 'thigh': '57',
                'body_fat_pct': ''}, database)

    # The demo deliberately has no photos: images require a separate consent/asset source.
    with sqlite3.connect(database) as connection:
        set_count = connection.execute('SELECT COUNT(*) FROM sets').fetchone()[0]
    summary = {'sets': set_count, 'body': len(features.list_body(database)),
               'meals': len(features.list_calories(database))}
    entries = journal.list_entries(database)
    summary.update({kind: sum(row['kind'] == kind for row in entries)
                    for kind in ('workout', 'water', 'steps', 'sleep', 'checkin', 'food')})
    return summary


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--database', type=Path, default=DEFAULT)
    args = parser.parse_args()
    counts = populate(args.database)
    print(f'Demo database created: {args.database.resolve()}')
    print('Period: 2026-10-21 through 2026-11-19; account: Demo Athlete')
    print('Records:', ', '.join(f'{key}={value}' for key, value in counts.items()))


if __name__ == '__main__':
    main()
