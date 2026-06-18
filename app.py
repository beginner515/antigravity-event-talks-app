import os
import urllib.request
import xml.etree.ElementTree as ET
import re
import time
from bs4 import BeautifulSoup
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}

# Simple in-memory cache to save bandwidth and prevent rate limiting
cache = {
    'data': None,
    'last_updated': 0
}
CACHE_TTL = 300  # 5 minutes

def parse_content(html_content):
    soup = BeautifulSoup(html_content, 'html.parser')
    updates = []
    
    # Check if there are any h3 tags indicating categories
    if not soup.find('h3'):
        desc_text = soup.get_text()
        return [{
            'category': 'General',
            'html': str(soup).strip(),
            'text': re.sub(r'\s+', ' ', desc_text).strip()
        }]
        
    current_category = None
    current_elements = []
    
    for element in soup.contents:
        if element.name == 'h3':
            if current_category:
                desc_html = "".join(str(e) for e in current_elements)
                desc_text = BeautifulSoup(desc_html, 'html.parser').get_text()
                updates.append({
                    'category': current_category,
                    'html': desc_html.strip(),
                    'text': re.sub(r'\s+', ' ', desc_text).strip()
                })
            current_category = element.get_text().strip()
            current_elements = []
        else:
            current_elements.append(element)
            
    if current_category:
        desc_html = "".join(str(e) for e in current_elements)
        desc_text = BeautifulSoup(desc_html, 'html.parser').get_text()
        updates.append({
            'category': current_category,
            'html': desc_html.strip(),
            'text': re.sub(r'\s+', ' ', desc_text).strip()
        })
        
    return updates

def fetch_release_notes(bypass_cache=False):
    now = time.time()
    if not bypass_cache and cache['data'] and (now - cache['last_updated'] < CACHE_TTL):
        return cache['data'], True

    try:
        req = urllib.request.Request(FEED_URL, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=10) as response:
            xml_data = response.read()
        
        root = ET.fromstring(xml_data)
        
        ATOM_NS = "{http://www.w3.org/2005/Atom}"
        entries = root.findall(f"{ATOM_NS}entry")
        if not entries:
            entries = root.findall('entry')
            
        parsed_entries = []
        for idx, entry in enumerate(entries):
            title_el = entry.find(f"{ATOM_NS}title")
            if title_el is None:
                title_el = entry.find('title')
                
            updated_el = entry.find(f"{ATOM_NS}updated")
            if updated_el is None:
                updated_el = entry.find('updated')
                
            link_el = entry.find(f"{ATOM_NS}link")
            if link_el is None:
                link_el = entry.find('link')
                
            content_el = entry.find(f"{ATOM_NS}content")
            if content_el is None:
                content_el = entry.find('content')
                
            id_el = entry.find(f"{ATOM_NS}id")
            if id_el is None:
                id_el = entry.find('id')
            
            title = title_el.text if title_el is not None else "No Date"
            updated = updated_el.text if updated_el is not None else ""
            
            link = ""
            if link_el is not None:
                link = link_el.attrib.get('href', '')
                if not link and link_el.text:
                    link = link_el.text
            
            # Extract ID anchor if possible or fallback to standard URL anchor
            entry_id = id_el.text if id_el is not None else ""
            anchor = ""
            if "#" in entry_id:
                anchor = entry_id.split("#")[-1]
            elif link and "#" in link:
                anchor = link.split("#")[-1]
            else:
                anchor = title.replace(" ", "_").replace(",", "")
            
            # Format standard link with anchor
            full_link = f"https://docs.cloud.google.com/bigquery/docs/release-notes#{anchor}" if anchor else link
            
            content_html = content_el.text if content_el is not None else ""
            
            updates = parse_content(content_html)
            
            parsed_entries.append({
                'id': entry_id,
                'date': title,
                'updated': updated,
                'link': full_link,
                'updates': updates
            })
            
        cache['data'] = parsed_entries
        cache['last_updated'] = now
        return parsed_entries, False
        
    except Exception as e:
        # Fallback to cache if request fails
        if cache['data']:
            return cache['data'], True
        raise e

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def api_release_notes():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    try:
        data, was_cached = fetch_release_notes(bypass_cache=force_refresh)
        return jsonify({
            'success': True,
            'cached': was_cached,
            'count': len(data),
            'notes': data
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
