import os

import requests
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.environ["GOV_API_KEY"]
BASE_URL = "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070"


def main():
    params = {
        "api-key": API_KEY,
        "format": "json",
        "limit": 5,
        "filters[state]": "Maharashtra",
        "filters[district]": "Nagpur",
    }

    # data.gov.in silently drops requests carrying the default
    # "python-requests/..." User-Agent (connection hangs until timeout).
    headers = {"User-Agent": "Mozilla/5.0"}

    response = requests.get(BASE_URL, params=params, headers=headers, timeout=15)
    response.raise_for_status()
    data = response.json()

    print(f"Status: {response.status_code}")
    print(f"Total records available: {data.get('total')}")
    print(f"Records returned: {data.get('count')}")
    print()

    for record in data.get("records", []):
        print(record)


if __name__ == "__main__":
    main()
