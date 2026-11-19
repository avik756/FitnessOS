"""FoodData Central lookup. Only food search terms leave the local server."""
import json
import os
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import URLError


def search(query):
    if not isinstance(query, str) or not 2 <= len(query.strip()) <= 100:
        raise ValueError('Enter 2-100 characters to search foods.')
    key = os.environ.get('USDA_API_KEY')
    if not key:
        raise ValueError('Food search needs USDA_API_KEY on the Python server. Manual nutrition entry is available below.')
    url = 'https://api.nal.usda.gov/fdc/v1/foods/search?' + urlencode({'api_key': key, 'query': query, 'pageSize': 12})
    try:
        with urlopen(Request(url, headers={'User-Agent': 'FitnessOS/1.0'}), timeout=12) as response:
            payload = json.load(response)
    except (URLError, ValueError, TimeoutError):
        raise ValueError('FoodData Central could not be reached. Try again or enter the label manually.') from None
    mapping = {1003:'protein', 1004:'fat', 1005:'carbs', 1079:'fiber', 2000:'sugar', 1258:'saturated_fat', 1093:'sodium', 1087:'calcium', 1089:'iron', 1092:'potassium', 1162:'vitamin_c', 1114:'vitamin_d'}
    results = []
    for food in payload.get('foods', []):
        nutrients = {mapping[row['nutrientId']]: row.get('value') for row in food.get('foodNutrients', []) if row.get('nutrientId') in mapping}
        calories = next((row.get('value') for row in food.get('foodNutrients', []) if row.get('nutrientId') == 1008), None)
        if calories is None:
            calories = next((row.get('value') for row in food.get('foodNutrients', []) if row.get('nutrientId') in (2047, 2048)), None)
        if calories is not None:
            results.append({'name': food['description'], 'brand': food.get('brandOwner', ''), 'id': food['fdcId'], 'kcal': calories, 'nutrition': nutrients, 'basis': '100 g'})
    return results
