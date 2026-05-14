#!/usr/bin/env python3
"""Round 2: Fix remaining files with hardcoded € that weren't in the first scan."""

import os
import re
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
PROJECT = os.path.join(ROOT, "..")

# Specific files to fix
FILES = [
    "app/refund-policy/page.tsx",
    "app/live/sessions/page.tsx",
    "components/home/LiveFeed.tsx",
    "components/posts/PostCard.tsx",
    "components/posts/CreatePostModal.tsx",
    "components/posts/UnlockPostModal.tsx",
    "components/common/SpendConfirmModal.tsx",
    "components/common/WalletPill.tsx",
]

def add_import(content):
    if 'from "@/utils/currency"' in content or "from '@/utils/currency'" in content:
        return content
    lines = content.split('\n')
    last_import_idx = -1
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith('import ') and ('from ' in stripped):
            last_import_idx = i
    if last_import_idx >= 0:
        lines.insert(last_import_idx + 1, 'import { cs } from "@/utils/currency";')
    else:
        insert_at = 0
        for i, line in enumerate(lines):
            if '"use client"' in line or "'use client'" in line or '"use strict"' in line:
                insert_at = i + 1
                break
        lines.insert(insert_at, 'import { cs } from "@/utils/currency";')
    return '\n'.join(lines)

def determine_context(chars, pos):
    before = chars[:pos]
    backtick_count = 0
    j = 0
    while j < len(before):
        if before[j] == '`' and (j == 0 or before[j-1] != '\\'):
            backtick_count += 1
        j += 1
    if backtick_count % 2 == 1:
        return 'template_literal'
    stripped_before = before.rstrip()
    if stripped_before.endswith('>') or stripped_before.endswith('}'):
        return 'jsx_text'
    double_count = before.count('"') - before.count('\\"')
    single_count = before.count("'") - before.count("\\'")
    if double_count % 2 == 1 or single_count % 2 == 1:
        return 'string_literal'
    return 'jsx_text'

def process_line(line):
    result = []
    i = 0
    while i < len(line):
        if line[i] == '€':
            context = determine_context(line, i)
            if context == 'template_literal':
                result.append('${cs()}')
            elif context == 'jsx_text':
                result.append('{cs()}')
            elif context == 'string_literal':
                result.append('${cs()}')
            else:
                result.append('${cs()}')
            i += 1
        else:
            result.append(line[i])
            i += 1
    return ''.join(result)

def replace_euros(content):
    lines = content.split('\n')
    new_lines = []
    for line in lines:
        if '€' not in line:
            new_lines.append(line)
            continue
        stripped = line.strip()
        if stripped.startswith('//') or stripped.startswith('*') or stripped.startswith('/*'):
            new_lines.append(line)
            continue
        new_lines.append(process_line(line))
    return '\n'.join(new_lines)

def main():
    modified = 0
    for rel_path in FILES:
        fpath = os.path.join(PROJECT, rel_path)
        if not os.path.exists(fpath):
            print(f"  ⚠ Not found: {rel_path}")
            continue
        with open(fpath, 'r', encoding='utf-8') as f:
            content = f.read()
        if '€' not in content:
            continue
        count = content.count('€')
        new_content = add_import(content)
        new_content = replace_euros(new_content)
        if new_content != content:
            with open(fpath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"  ✓ {rel_path} ({count} replacements)")
            modified += 1
    print(f"\n  Done: {modified} files modified")

if __name__ == '__main__':
    main()
