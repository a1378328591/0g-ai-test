from playwright.sync_api import sync_playwright
from urllib.parse import urljoin
import json
import time
import re

BASE_URL = "https://docs.0g.ai"
URL_PATHS = [
    "/", "/introduction/vision-mission", "/concepts/chain", "/concepts/computing", "/concepts/da", "/concepts/storage",
    "/developer-hub/getting-started", "/developer-hub/testnet/testnet-overview",
    "/developer-hub/building-on-0g/introduction", "/building-on-0g/contracts-on-0g/deploy-contracts",
    "/developer-hub/building-on-0g/contracts-on-0g/staking-interfaces",
    "/developer-hub/building-on-0g/contracts-on-0g/precompiles/precompiles-overview",
    "/developer-hub/building-on-0g/contracts-on-0g/precompiles/precompiles-dasigners",
    "/developer-hub/building-on-0g/contracts-on-0g/precompiles/precompiles-wrappedogbase",
    "/developer-hub/building-on-0g/compute-network/overview", "/developer-hub/building-on-0g/compute-network/sdk",
    "/developer-hub/building-on-0g/compute-network/cli", "/developer-hub/building-on-0g/compute-network/inference-provider",
    "/developer-hub/building-on-0g/compute-network/fine-tuning-provider",
    "/developer-hub/building-on-0g/storage/sdk", "/developer-hub/building-on-0g/storage/storage-cli",
    "/developer-hub/building-on-0g/da-integration", "/developer-hub/building-on-0g/da-deep-dive",
    "/run-a-node/overview", "/run-a-node/validator-node", "/run-a-node/storage-node", "/run-a-node/da-node",
    "/run-a-node/community-docker-repo", "/resources/security", "/resources/how-to-contribute",
    "/resources/glossary", "/node-sale/intro/", "/node-sale/intro/node-holder-benefits",
    "/node-sale/intro/sale-structure", "/node-sale/intro/eligibility",
    "/node-sale/details/purchasing-nodes", "/node-sale/details/incentives-and-rewards",
    "/node-sale/details/compliance-and-regulatory", "/node-sale/faq"
]

def clean_string(s):
    if not isinstance(s, str):
        return s
    # 替换常见转义字符
    s = s.replace('\\n', ' ').replace('\n', ' ')
    s = s.replace('\\t', ' ').replace('\t', ' ')
    s = s.replace('\\"', '"').replace("\\'", "'")
    s = s.replace("\\", "")
    # 去除前后引号（如果有）："abc" -> abc
    s = s.strip('"').strip("'")
    # 合并多余空格
    s = re.sub(r'\s+', ' ', s)
    return s.strip()

def clean_data(obj):
    if isinstance(obj, dict):
        return {k: clean_data(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [clean_data(elem) for elem in obj]
    elif isinstance(obj, str):
        return clean_string(obj)
    else:
        return obj

def extract_structured_content(page):
    page.wait_for_selector(".docMainContainer_TBSr", timeout=10000)
    content_container = page.query_selector(".docMainContainer_TBSr")

    if not content_container:
        raise ValueError("❌ 未找到主要内容容器")

    h1_element = content_container.query_selector("h1")
    menu_title = h1_element.inner_text().strip() if h1_element else "Untitled"

    h2_elements = content_container.query_selector_all("h2")
    sections = []

    for h2 in h2_elements:
        section_title = h2.inner_text().strip()
        section_content = []

        next_sibling = h2.evaluate_handle("el => el.nextElementSibling")

        while next_sibling:
            if next_sibling.as_element() is None:
                break
            try:
                tag_name = next_sibling.evaluate("el => el.tagName").lower()
            except Exception:
                break
            if tag_name == "h2":
                break
            try:
                text = next_sibling.inner_text()
                section_content.append(text.strip())
            except:
                pass
            next_sibling = next_sibling.evaluate_handle("el => el.nextElementSibling")

        sections.append({
            "title": section_title,
            "content": "\n".join(section_content).strip()
        })

    return {
        "menu": menu_title,
        "sections": sections
    }

def crawl_structured_all():
    results = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        for path in URL_PATHS:
            full_url = urljoin(BASE_URL, path)
            print(f"🌐 抓取结构化内容: {full_url}")
            try:
                page.goto(full_url)
                time.sleep(1.5)
                result = extract_structured_content(page)
                results.append(result)
            except Exception as e:
                print(f"❌ 抓取失败: {full_url}, 错误: {e}")

        browser.close()

    return results

if __name__ == "__main__":
    raw_data = crawl_structured_all()
    with open("0g_structured_content.json", "w", encoding="utf-8") as f:
        json.dump(raw_data, f, ensure_ascii=False, indent=2)
    print("✅ 原始内容已保存为 0g_structured_content.json")

    cleaned_data = clean_data(raw_data)
    with open("0g_structured_content_cleaned.json", "w", encoding="utf-8") as f:
        json.dump(cleaned_data, f, ensure_ascii=False, indent=2)
    print("✅ 清洗完成，已保存为 0g_structured_content_cleaned.json")
