#!/usr/bin/env python3
import glob, re, sys, os

pattern_dash_key = re.compile(r'^\s*-\s*([^\s:][^:]*)\s*:')
pattern_key = re.compile(r'^\s*([^\s:-][^:]*)\s*:')


def analyze_file(path):
    dupes = []
    # stack entries: (indent, keys_dict, path_list)
    stack = [(-1, {}, [])]
    with open(path, 'r', encoding='utf-8') as f:
        for lineno, line in enumerate(f, 1):
            s = line.rstrip('\n')
            if not s.strip() or s.lstrip().startswith('#'):
                continue
            # detect list-item keys like "- name: ..."
            m_dash = pattern_dash_key.match(s)
            if m_dash:
                key = m_dash.group(1).strip()
                leading_spaces = len(s) - len(s.lstrip(' '))
                indent = leading_spaces + 2
                # sequence item: start a fresh mapping context for this item
                while stack and stack[-1][0] >= indent:
                    stack.pop()
                parent_indent, parent_keys, parent_path = stack[-1]
                # create a new mapping for this sequence item so keys inside
                # different list items aren't considered duplicates
                new_item_keys = {key: True}
                new_path = parent_path + ['[item]', key]
                # use a slightly smaller indent for the list-item context
                # so subsequent keys at the same visual indent are treated
                # as children of the item rather than siblings
                stack.append((indent - 0.1, new_item_keys, new_path))
                continue

            # normal mapping key
            m = pattern_key.match(s)
            if not m:
                continue
            key = m.group(1).strip()
            indent = len(s) - len(s.lstrip(' '))
            while stack and stack[-1][0] >= indent:
                stack.pop()
            parent_indent, parent_keys, parent_path = stack[-1]
            if key in parent_keys:
                dupes.append((lineno, key, list(parent_path)))
            parent_keys[key] = True
            new_path = parent_path + [key]
            stack.append((indent, {}, new_path))
    return dupes


def main():
    base = os.getcwd()
    files = glob.glob(os.path.join(base, '.github', 'workflows', '*.yml')) + glob.glob(os.path.join(base, '.github', 'workflows', '*.yaml'))
    if not files:
        print('No workflow files found.')
        return 0
    total_dupes = False
    for path in sorted(files):
        dupes = analyze_file(path)
        if dupes:
            total_dupes = True
            print('Duplicate keys in:', path)
            for lineno, key, parent in dupes:
                parent_display = '/' + '/'.join(parent) if parent else '/'
                print(f"  Line {lineno}: key '{key}' under parent {parent_display}")
    if total_dupes:
        print('Duplicates detected.')
        return 1
    else:
        print('No duplicate mapping keys found.')
        return 0


if __name__ == '__main__':
    sys.exit(main())
