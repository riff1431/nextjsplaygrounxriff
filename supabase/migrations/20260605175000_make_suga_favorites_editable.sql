-- Make Suga4U Favorites split editable/dynamic
UPDATE platform_split_config
SET is_editable = TRUE,
    description = 'Suga4U Favorites interactions split.'
WHERE split_key = 'SUGA4U_FAVORITES';
