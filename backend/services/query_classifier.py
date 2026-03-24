"""Server-side query type classifier for search observability.

Classifies search queries into three categories using keyword heuristics:
- item_specific: food, drink, or brew method queries
- specialty_coffee: coffee origin, roast level, or processing method queries
- generic: everything else (ambience, facilities, location)

Priority: item_specific > specialty_coffee > generic
"""

import re

# Compiled at module level per performance standards — zero per-request cost.

_ITEM_KEYWORDS = re.compile(
    r"巴斯克蛋糕|司康|可頌|肉桂捲|戚風蛋糕|提拉米蘇|布丁|鬆餅|貝果|三明治|甜點|蛋糕"
    r"|拿鐵|卡布奇諾|美式|摩卡|抹茶|可可|果汁|氣泡水|手沖|冰滴|冷萃|虹吸|愛樂壓"
    r"|latte|cappuccino|espresso|americano|mocha|matcha|croissant|scone"
    r"|pour.?over|cold.?brew|drip",
    re.IGNORECASE,
)

_SPECIALTY_KEYWORDS = re.compile(
    r"單品|淺焙|中焙|深焙|日曬|水洗|蜜處理|厭氧"
    r"|衣索比亞|肯亞|哥倫比亞|巴拿馬|瓜地馬拉|耶加雪菲|藝伎|geisha"
    r"|SCA|精品咖啡|自家烘焙|specialty",
    re.IGNORECASE,
)


def classify(query: str) -> str:
    """Classify a search query into item_specific, specialty_coffee, or generic.

    item_specific takes priority over specialty_coffee.
    """
    if _ITEM_KEYWORDS.search(query):
        return "item_specific"
    if _SPECIALTY_KEYWORDS.search(query):
        return "specialty_coffee"
    return "generic"
