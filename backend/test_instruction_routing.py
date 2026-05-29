from main import is_start_article_instruction, requested_article_num


def test_requested_article_num_recognizes_english_start_phrases():
    assert requested_article_num("start article 6") == 6
    assert requested_article_num("write article 006") == 6
    assert requested_article_num("draft post 12") == 12
    assert requested_article_num("Create Chapter 003") == 3


def test_requested_article_num_recognizes_chinese_start_phrases():
    assert requested_article_num("开始第六篇") == 6
    assert requested_article_num("开始第 6 篇") == 6
    assert requested_article_num("写第十二篇") == 12
    assert requested_article_num("生成第十篇文章") == 10


def test_is_start_article_instruction_requires_start_intent():
    assert is_start_article_instruction("start article 6")
    assert is_start_article_instruction("开始第六篇")
    assert is_start_article_instruction("写第十二篇")

    assert not is_start_article_instruction("review article 6")
    assert not is_start_article_instruction("第六篇需要更紧凑一点")
    assert not is_start_article_instruction("compare post 12 with post 13")
