from utils.url_classifier import classify_social_url


def test_classifies_instagram_url():
    result = classify_social_url("https://www.instagram.com/somecafe")
    assert result == {
        "instagram_url": "https://www.instagram.com/somecafe",
        "facebook_url": None,
        "threads_url": None,
    }


def test_classifies_instagr_am_shortlink():
    result = classify_social_url("https://instagr.am/p/abc123")
    assert result["instagram_url"] == "https://instagr.am/p/abc123"


def test_classifies_facebook_url():
    result = classify_social_url("https://www.facebook.com/somecafe")
    assert result == {
        "instagram_url": None,
        "facebook_url": "https://www.facebook.com/somecafe",
        "threads_url": None,
    }


def test_classifies_fb_me_shortlink():
    result = classify_social_url("https://fb.me/somepage")
    assert result["facebook_url"] == "https://fb.me/somepage"


def test_classifies_mobile_facebook():
    result = classify_social_url("https://m.facebook.com/somecafe")
    assert result["facebook_url"] == "https://m.facebook.com/somecafe"


def test_classifies_threads_url():
    result = classify_social_url("https://www.threads.net/@somecafe")
    assert result == {
        "instagram_url": None,
        "facebook_url": None,
        "threads_url": "https://www.threads.net/@somecafe",
    }


def test_returns_all_null_for_unrecognized_url():
    result = classify_social_url("https://www.somecafe.com")
    assert result == {"instagram_url": None, "facebook_url": None, "threads_url": None}


def test_returns_all_null_for_none_input():
    result = classify_social_url(None)
    assert result == {"instagram_url": None, "facebook_url": None, "threads_url": None}


def test_returns_all_null_for_empty_string():
    result = classify_social_url("")
    assert result == {"instagram_url": None, "facebook_url": None, "threads_url": None}
