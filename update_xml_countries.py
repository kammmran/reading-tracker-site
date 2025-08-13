#!/usr/bin/env python3
"""
Script to automatically add country information to XML files based on the authors-config.js file.
This script reads the authorCountries configuration and updates XML files that don't have country information.
"""

import os
import re
import xml.etree.ElementTree as ET
from pathlib import Path

# Author to country mapping (based on your authors-config.js)
AUTHOR_COUNTRIES = {
    # Ancient Authors (Greek)
    'Sophocles': 'Ancient Greece',
    'Aeschylus': 'Ancient Greece',
    'Euripides': 'Ancient Greece',
    'Aristophanes': 'Ancient Greece',
    'Herodotus': 'Ancient Greece',
    'Thucydides': 'Ancient Greece',
    'Plato': 'Ancient Greece',
    'Aristotle': 'Ancient Greece',
    'Homer': 'Ancient Greece',
    'Phrynichus': 'Ancient Greece',
    'Thespis': 'Ancient Greece',
    
    # Renaissance Authors
    'Molière': 'France',
    'Carlo Goldoni': 'Italy',
    'Pierre‑Augustin Caron de Beaumarchais': 'France',
    'François Rabelais': 'France',
}

def add_country_to_xml(file_path, author_name, country):
    """Add country information to an XML file if it doesn't already exist."""
    try:
        # Read the file content
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check if country tag already exists
        if '<country>' in content:
            print(f"  ✓ {file_path.name} already has country information")
            return False
        
        # Find the death_year tag and add country after it
        pattern = r'(\s*<death_year>.*?</death_year>)\s*'
        replacement = f'\\1\n    <country>{country}</country>'
        
        new_content = re.sub(pattern, replacement, content)
        
        if new_content != content:
            # Write the updated content back
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"  ✓ Added country '{country}' to {file_path.name}")
            return True
        else:
            print(f"  ✗ Could not find death_year tag in {file_path.name}")
            return False
            
    except Exception as e:
        print(f"  ✗ Error processing {file_path.name}: {e}")
        return False

def get_author_name_from_xml(file_path):
    """Extract author name from XML file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Try to find name or n tag
        name_match = re.search(r'<(?:name|n)>(.*?)</(?:name|n)>', content)
        if name_match:
            return name_match.group(1).strip()
        return None
    except Exception as e:
        print(f"Error reading {file_path.name}: {e}")
        return None

def main():
    # Define the data directories
    base_dir = Path(__file__).parent / 'readings' / 'static' / 'data'
    directories = ['ancient', 'renaissance', 'medieval', 'modern']
    
    print("🌍 Adding country information to XML files...")
    print("=" * 50)
    
    total_updated = 0
    
    for directory in directories:
        dir_path = base_dir / directory
        if not dir_path.exists():
            print(f"📁 Directory {directory} does not exist, skipping...")
            continue
            
        print(f"📁 Processing {directory} directory...")
        
        # Get all XML files in the directory
        xml_files = list(dir_path.glob('*.xml'))
        
        if not xml_files:
            print(f"  No XML files found in {directory}")
            continue
        
        for xml_file in xml_files:
            author_name = get_author_name_from_xml(xml_file)
            
            if not author_name:
                print(f"  ⚠️  Could not extract author name from {xml_file.name}")
                continue
            
            if author_name in AUTHOR_COUNTRIES:
                country = AUTHOR_COUNTRIES[author_name]
                if add_country_to_xml(xml_file, author_name, country):
                    total_updated += 1
            else:
                print(f"  ⚠️  No country mapping found for '{author_name}' in {xml_file.name}")
        
        print()
    
    print(f"✅ Complete! Updated {total_updated} XML files with country information.")
    print("\n📝 Next steps:")
    print("1. Add any missing authors to the AUTHOR_COUNTRIES dictionary in this script")
    print("2. Run this script again to update remaining files")
    print("3. Refresh your website to see the country filter working")

if __name__ == "__main__":
    main()
