import re

BACKUP = '/root/backup_yowthi_erp_20260626_135830.sql'
OUTPUT = '/tmp/restore-master-data.sql'

TABLES = [
    'farmers',
    'employees',
    'suppliers',
    'carriers',
    'customers',
    'receiving_items',
    'processing_items',
    'packaging_items',
    'products',
]

with open(BACKUP, 'r', encoding='utf-8') as f:
    content = f.read()

blocks = {}
for table in TABLES:
    pattern = re.compile(
        r'(COPY public\.' + table + r'\s*\(.*?\) FROM stdin;\n.*?\\\.)',
        re.DOTALL
    )
    match = pattern.search(content)
    if match:
        blocks[table] = match.group(1)
    else:
        blocks[table] = None

lines = []
lines.append('-- Restored master data from backup 20260626_135830')
lines.append('')

for table in TABLES:
    lines.append(f'TRUNCATE TABLE public.{table} CASCADE;')

lines.append('')

for table in TABLES:
    if blocks[table]:
        lines.append(f'-- {table}')
        lines.append(blocks[table])
        lines.append('')
    else:
        lines.append(f'-- WARNING: no data found for {table}')
        lines.append('')

with open(OUTPUT, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))

print('Done. Tables extracted:')
for table in TABLES:
    if blocks[table]:
        row_count = blocks[table].count('\n') - 1
        print(f'  {table}: ~{row_count} rows')
    else:
        print(f'  {table}: NOT FOUND')
