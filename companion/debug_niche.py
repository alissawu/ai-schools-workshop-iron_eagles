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
                            
                            if "blocks" in content:
                                blocks = content["blocks"]
                                print(f"\n=== profile.content.blocks ({len(blocks)} items) ===")
                                for i, block in enumerate(blocks[:10]):
                                    if isinstance(block, dict):
                                        template = block.get("template", "")
                                        print(f"  block[{i}] template: {template}")
                                        
                                        # Dig into ReportCard block
                                        if "ReportCard" in template:
                                            print(f"\n=== REPORT CARD BLOCK ===")
                                            print(f"  block keys: {list(block.keys())}")
                                            buckets = block.get("buckets", [])
                                            print(f"  buckets type: {type(buckets).__name__}, len/keys: {len(buckets) if isinstance(buckets, list) else list(buckets.keys()) if isinstance(buckets, dict) else 'n/a'}")
                                            
                                            # Handle both list and dict
                                            bucket_items = buckets if isinstance(buckets, list) else buckets.values() if isinstance(buckets, dict) else []
                                            for j, bucket in enumerate(list(bucket_items)[:5]):
                                                if isinstance(bucket, dict):
                                                    print(f"\n  bucket[{j}] keys: {list(bucket.keys())}")
                                                    contents = bucket.get("contents", [])
                                                    print(f"  bucket[{j}] contents count: {len(contents) if isinstance(contents, list) else 'not a list'}")
                                                    content_items = contents if isinstance(contents, list) else contents.values() if isinstance(contents, dict) else []
                                                    for k, item in enumerate(list(content_items)[:15]):
                                                        if isinstance(item, dict):
                                                            print(f"    item[{k}]: template={item.get('template')}, label={item.get('label')}, value={item.get('value')}")
                            
                            if "profileEntity" in content:
                                pe = content["profileEntity"]
                                print("\n=== profile.content.profileEntity KEYS ===")
                                print(list(pe.keys())[:20] if isinstance(pe, dict) else pe)
                                if isinstance(pe, dict):
                                    for key in ["overallGrade", "grades", "grade", "rating", "reportCard"]:
                                        if key in pe:
                                            print(f"\n=== profileEntity.{key} ===")
                                            print(json.dumps(pe[key], indent=2)[:1000])
                            
                            if "entity_data" in content:
                                ed = content["entity_data"]
                                print("\n=== profile.content.entity_data KEYS ===")
                                print(list(ed.keys())[:20] if isinstance(ed, dict) else ed)
                                if isinstance(ed, dict):
                                    for key in ["overallGrade", "grades", "grade", "rating", "reportCard"]:
                                        if key in ed:
                                            print(f"\n=== entity_data.{key} ===")
                                            print(json.dumps(ed[key], indent=2)[:1000])
                    
                except json.JSONDecodeError as e:
                    print(f"JSON parse error: {e}")
                    print(f"Around error: {json_str[max(0,e.pos-50):e.pos+50]}")
                
                break
    
    await browser.close()
    await pw.stop()
    print("\nDone!")


if __name__ == "__main__":
    asyncio.run(main())
