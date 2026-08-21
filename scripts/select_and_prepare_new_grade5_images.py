import hashlib
import json
import re
import shutil
from pathlib import Path

ROOT = Path('/home/ubuntu/vocabulary-flashcards')
ANALYSIS_PATH = ROOT / 'grade5_new_batch_analysis.json'
SEMANTIC_PATH = ROOT / 'grade5_new_batch_semantic_high_candidates.json'
IMAGE_MAP_PATH = ROOT / 'client/src/lib/grade5-cartoon-images.ts'
ACCEPTED_PATH = ROOT / 'grade5_new_batch_accepted_matches.json'
MANIFEST_PATH = ROOT / 'grade5_new_batch_upload_manifest.json'
READY_DIR = Path('/home/ubuntu/webdev-static-assets/grade5-new-ready-upload')

MAP_ENTRY = re.compile(r'^\s*"([^"]+)":\s*"([^"]+)"', re.MULTILINE)


def normalize(value: str) -> str:
    value = re.sub(r'\([^)]*\)', '', value.lower())
    value = re.sub(r'[^a-z0-9]+', ' ', value)
    return re.sub(r'\s+', ' ', value).strip()


def pick_prefix(entries, prefix: str):
    match = next((entry for entry in entries if entry['image_name'].startswith(prefix)), None)
    if not match:
        raise ValueError(f'Missing reviewed image with filename prefix: {prefix}')
    return match


analysis = json.loads(ANALYSIS_PATH.read_text(encoding='utf-8'))
semantic = json.loads(SEMANTIC_PATH.read_text(encoding='utf-8'))['candidates']
existing_terms = {normalize(term) for term, _ in MAP_ENTRY.findall(IMAGE_MAP_PATH.read_text(encoding='utf-8'))}
exact_by_term = {}
for entry in analysis['exact_matches']:
    exact_by_term.setdefault(normalize(entry['term']), []).append(entry)
semantic_by_name = {entry['image_name']: entry for entry in semantic}

# These terms/pictures were approved after visual review of the contact sheets.
EXACT_PREFIXES = {
    'roads': 'Cars_driving_on_winding_roads',
    'rides': 'Cartoon_amusement_park_rides',
    'relaxing': 'Cartoon_character_relaxing',
    'coffee shop': 'Cartoon_coffee_shop',
    'miners': 'Cartoon_miners_holding_picks',
    'supermarket': 'Cartoon_supermarket_with_fruits',
    'fist': 'Hand_showing_fist_shape',
    'steel': 'Steel_beams_building_tall_structure',
    'basin': 'Stone_basin_with_water',
    'stressed': 'Stressed_cartoon_character',
    'thick': 'Thick_cartoon_book',
    'toothpaste': 'Toothpaste_and_toothbrush',
    'thought': 'Child_thinking_with_thought_bubble',
    'airport': 'Airplane_taking_off_from_airport',
    'bakery': 'Bakery_window_displaying',
    'fabric': 'Colorful_fabric_rolls',
}

SEMANTIC_PREFIX_TO_TERM = {
    'Children_shaking_hands_agreeing': 'agreed',
    'Green_plant_growing_in_soil': 'alive',
    'Cartoon_character_tasting_awful': 'awful / terrible',
    'Beating_heart_medical_concept': 'beat',
    'Glowing_cartoon_diamond': 'bright/shiny',
    'Cartoon_dog_bringing_ball': 'bring',
    'Cartoon_hands_clapping_together': 'clapped',
    'Cartoon_child_beckoning_playground': 'come',
    'Kid_controlling_toy_car': 'control',
    'Pot_of_soup_cooking': 'cooked',
    'Yellow_lightbulb_representing': 'electricity',
    'Farmer_planting_seeds': 'farming',
    'Spatula_turning_cartoon_pancake': 'flipped',
    'Rubber_duck_floating_on_pond': 'floated',
    'Cartoon_character_with_thermometer': 'get sick',
    'Sleepy_child_yawning_at_night': 'get tired',
    'People_walking_in_town_square': 'go for a walk',
    'Cartoon_park_with_green_trees': 'green areas',
    'Friends_sitting_and_talking': 'hang out with',
    'Baseball_hitting_wooden_bat': 'hit',
    'Bears_together_in_forest_cave': 'home to',
    'Gold_rings_and_necklaces': 'jewelry',
    'Children_jumping_and_laughing': 'joy',
    'Farmer_keeping_farm_animals': 'keep animals',
    'Dolphin_leaping_from_ocean': 'leap',
    'Cartoon_bread_loaves_count': 'loaf / loaves',
    'Child_measuring_weight_loss': 'lose weight',
    'Wooden_chair_beside_tree_trunk': 'made of',
    'Leader_managing_community_event': 'manage',
    'Crystals_and_gold_in_cave': 'mineral resources',
    'Cartoon_battery_with_glowing_energy': 'power',
    'Cartoon_toy_car_with_solar': 'powered',
    'Cartoon_child_reading_calmly': 'quiet / calm',
    'Plate_with_seafood': 'sea food',
    'Boy_searching_through_grass': 'search for',
    'Cartoon_sun_shining_over_hill': 'shine',
    'Silver_star_illustration_smiling': 'shiny',
    'Child_holding_shopping_bags': 'shopped',
    'Child_bowing_to_elder': 'show respect',
    'Hand_spreading_butter_on_toast': 'spread',
    'Cartoon_character_thinking_hard': 'think hard',
    'Cartoon_weather_icons_showing': 'weather conditions',
    'Child_holding_gold_medal': 'Well done! Excellent',
    'Child_whispering_secret_to_another': 'whispered',
    'Yellow_sand_blowing_in_wind': 'winds with sand',
}

selected = []
for term_key, prefix in EXACT_PREFIXES.items():
    candidate = pick_prefix(exact_by_term.get(normalize(term_key), []), prefix)
    selected.append({**candidate, 'source': 'new_batch_exact_visual_review'})

for prefix, expected_term in SEMANTIC_PREFIX_TO_TERM.items():
    candidate = pick_prefix(list(semantic_by_name.values()), prefix)
    if normalize(candidate['term']) != normalize(expected_term):
        candidate = {
            **candidate,
            'semantic_suggestion': candidate['term'],
            'term': expected_term,
        }
    selected.append({**candidate, 'source': 'new_batch_semantic_visual_review'})

seen_terms, seen_images = set(), set()
approved = []
for item in selected:
    term_key = normalize(item['term'])
    image_path = Path(item['image_path'])
    if term_key in existing_terms:
        raise ValueError(f'Term already has an image map entry: {item["term"]}')
    if term_key in seen_terms or str(image_path) in seen_images:
        raise ValueError(f'Duplicate selected term or image: {item["term"]} / {image_path.name}')
    seen_terms.add(term_key)
    seen_images.add(str(image_path))
    approved.append(item)

if READY_DIR.exists():
    shutil.rmtree(READY_DIR)
READY_DIR.mkdir(parents=True)
manifest = []
for index, item in enumerate(approved, start=1):
    source = Path(item['image_path'])
    digest = hashlib.sha1(source.read_bytes()).hexdigest()[:10]
    extension = source.suffix.lower()
    output = READY_DIR / f'grade5-new-{index:03d}-{digest}{extension}'
    shutil.copy2(source, output)
    manifest.append({
        'term': item['term'],
        'arabic': item.get('arabic', ''),
        'source': item['source'],
        'original_image_name': source.name,
        'original_image_path': str(source),
        'local_upload_path': str(output),
    })

ACCEPTED_PATH.write_text(json.dumps({'matches': approved}, ensure_ascii=False, indent=2), encoding='utf-8')
MANIFEST_PATH.write_text(json.dumps({'uploads': manifest}, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'Approved {len(approved)} reviewed matches and prepared {len(manifest)} ASCII-safe upload files.')
