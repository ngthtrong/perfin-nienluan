# Private media evaluation inputs

Place user-supplied, consented and PII-reviewed files under `raw/` (ignored by
Git). Copy `manifest.template.csv` to `manifest.csv` (also ignored) and fill
one row per sample. Keep only hashes, aggregate metrics and an anonymized
manifest in the repository when it has been reviewed. Do not commit
image/audio binaries or raw transcripts.

Required manifest fields:

`sample_id,modality,file_name,sha256,reference_text,expected_amount,expected_type,expected_date,expected_merchant,expected_category,consent_ok,pii_reviewed`

The benchmark remains `Not measured` until at least 20 images and 20 audio
samples have a complete ground truth row.
