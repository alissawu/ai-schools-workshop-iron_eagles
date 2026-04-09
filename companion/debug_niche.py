#!/usr/bin/env python3
"""
Debug script to fetch Niche page and dump the __PRELOADED_STATE__ JSON.

Usage:
    python debug_niche.py

This will open a browser, fetch Newark Public School District page,
and save the JSON to debug_output.json
"""

import asyncio
import json
import re

from patchright.async_api import async_playwright


async def main():
    url = "https://www.niche.com/k12/d/newark-public-school-district-nj/"
    
    print(f"Fetching {url}...")
    
    pw = await async_playwright().start()
    browser = await pw.chromium.launch(headless=False)
    
    ctx = await browser.new_context(
        user_agent=(
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/131.0.0.0 Safari/537.36"
        ),
        viewport={"width": 1280, "height": 800},
        locale="en-US",
        timezone_id="America/New_York",
    )
    
    page = await ctx.new_page()
    await page.goto(url, wait_until="networkidle", timeout=30000)
    
    # Wait a bit
    await asyncio.sleep(2)
    
    html = await page.content()
    
    # Extract __PRELOADED_STATE__
    marker = "window.__PRELOADED_STATE__"
    idx = html.find(marker)
    
    if idx == -1:
        print("ERROR: Could not find __PRELOADED_STATE__")
        await browser.close()
        await pw.stop()
        return
    
    # Find the JSON
    start = html.find("{", idx)
    depth = 0
    in_string = False
    escape = False
    
    for i, c in enumerate(html[start:], start):
        if escape:
            escape = False
            continue
        if c == '\\' and in_string:
            escape = True
            continue
        if c == '"' and not escape:
            in_string = not in_string
            continue
        if in_string:
            continue
        if c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                json_str = html[start:i+1]
                # Fix JS -> JSON
                json_str = json_str.replace(':undefined', ':null')
                json_str = json_str.replace(': undefined', ': null')
                
                try:
                    data = json.loads(json_str)
                    
                    # Save full JSON
                    with open("debug_output.json", "w") as f:
                        json.dump(data, f, indent=2)
                    print("Saved full JSON to debug_output.json")
                    
                    # Print relevant parts
                    print("\n=== TOP LEVEL KEYS ===")
                    print(list(data.keys()))
                    
                    if "profile" in data:
                        print("\n=== profile KEYS ===")
                        print(list(data["profile"].keys()))
                        
                        if "content" in data["profile"]:
                            content = data["profile"]["content"]
                            print("\n=== profile.content KEYS ===")
                            print(list(content.keys()))
                            
                            if "grades" in content:
                                print("\n=== profile.content.grades ===")
                                print(json.dumps(content["grades"], indent=2))
                            
                            if "entity" in content:
                                print("\n=== profile.content.entity KEYS ===")
                                print(list(content["entity"].keys())[:20])
                                
                                entity = content["entity"]
                                for key in ["overallGrade", "grades", "grade", "rating"]:
                                    if key in entity:
                                        print(f"\n=== entity.{key} ===")
                                        print(json.dumps(entity[key], indent=2)[:500])
                    
                except json.JSONDecodeError as e:
                    print(f"JSON parse error: {e}")
                    print(f"Around error: {json_str[max(0,e.pos-50):e.pos+50]}")
                
                break
    
    await browser.close()
    await pw.stop()
    print("\nDone!")


if __name__ == "__main__":
    asyncio.run(main())
