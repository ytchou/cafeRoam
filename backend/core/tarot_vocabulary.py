"""Fixed tarot title vocabulary for the Explore Tarot feature.

Each shop is assigned one title during enrichment based on its taxonomy tags.
The enrichment prompt selects the best-fitting title from this list.
"""

# Ordered list of all valid tarot titles.
TAROT_TITLES: list[str] = [
    "The Scholar's Refuge",
    "The Enchanted Corner",
    "The Hidden Alcove",
    "The Alchemist's Table",
    "The Open Sky",
    "The Morning Garden",
    "The Master's Workshop",
    "The Silent Chapel",
    "The Time Capsule",
    "The Grand Hall",
    "The Crown",
    "The Familiar's Den",
    "The Lookout",
    "The Forest Floor",
    "The Iron Garden",
    "The Midnight Lamp",
    "The Eastern Path",
    "The Collector's Room",
    "The Quick Draw",
    "The Library",
]

# Tag combinations that map to each title.
# Used in the enrichment prompt so Claude picks the best match.
TITLE_TO_TAGS: dict[str, list[str]] = {
    "The Scholar's Refuge": ["quiet", "laptop_friendly", "wifi_available"],
    "The Enchanted Corner": ["cozy", "photogenic", "good_espresso"],
    "The Hidden Alcove": ["hidden_gem", "local_favorite"],
    "The Alchemist's Table": ["self_roasted", "pour_over"],
    "The Open Sky": ["outdoor_seating", "scenic_view"],
    "The Morning Garden": ["brunch", "photogenic", "casual"],
    "The Master's Workshop": ["espresso", "self_roasted"],
    "The Silent Chapel": ["quiet", "minimalist"],
    "The Time Capsule": ["retro", "local_favorite"],
    "The Grand Hall": ["social", "large_space", "group_friendly"],
    "The Crown": ["specialty_coffee", "award_winning"],
    "The Familiar's Den": ["cat_cafe", "dog_friendly"],
    "The Lookout": ["rooftop", "view"],
    "The Forest Floor": ["forest_style", "natural_light"],
    "The Iron Garden": ["industrial", "minimalist"],
    "The Midnight Lamp": ["night_friendly", "late_hours"],
    "The Eastern Path": ["japanese_style"],
    "The Collector's Room": ["vintage", "retro"],
    "The Quick Draw": ["standing_bar", "espresso"],
    "The Library": ["bookshelf", "reading_friendly"],
}
