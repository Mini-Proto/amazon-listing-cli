# Image Renaming Guide for Amazon Listing Production

This guide explains how to use the Image Renamer Agent for batch renaming of product images in Amazon listing production workflows.

## Quick Start

```bash
# Preview rename operations (safe, no changes made)
amazon-harness rename-images ./images

# Execute renames for MFJ family only
amazon-harness rename-images ./images --family MFJ --execute

# Use custom CSV data and show detailed progress
amazon-harness rename-images ./images --csv-file "Amazon Product Pricing - SKU BOMs.csv" --verbose --execute
```

## Supported Naming Patterns

The Image Renamer Agent recognizes these filename patterns and converts them to Amazon-compliant SKU format:

### Input Pattern Examples
- `"2x1 Female Receptacle to Female Receptacle, 6in 1.png"`
- `"MFJ 4-pin Female to Male Connector 12 inch 2pack Main.jpg"`
- `"UF3_6p_M-M_6in_2pk_Secondary.png"`
- `"DDT 3-position plug to plug 12in harness main.jpeg"`

### Output Pattern (Amazon Standard)
`MPA-{FAMILY}-{PINS}p-{TYPE1}-{TYPE2}-{LENGTH}-{PACK}pk-{VARIANT}.{ext}`

Examples:
- `"MPA-MFJ-2p-F-F-6in-2pk-Main.png"`
- `"MPA-MFJ-4p-F-M-12in-2pk-Main.jpg"`
- `"MPA-UF3-6p-M-M-6in-2pk-Secondary.png"`
- `"MPA-DDT-3p-M-M-12in-2pk-Main.jpeg"`

## Connector Families Supported

| Family | Description | Pattern Variants |
|--------|-------------|------------------|
| MFJ | Micro-Fit Jr. | MFJ, (MFJ), micro-fit, microfit |
| UF3 | Ultra-Fit 3.0mm | UF3, (UF3), ultra-fit, ultrafit |
| DDT | Deutsch DT Series | DDT, (DDT), deutsch, dt04, dt06 |
| DTM | Deutsch DTM Series | DTM, (DTM), dtm04, dtm06 |

## Command Options

### Basic Options
- `--dry-run` (default): Preview operations without making changes
- `--execute`: Actually perform the rename operations
- `--verbose`: Show detailed progress and confidence scores
- `--family <FAMILY>`: Filter to specific connector family (MFJ, UF3, DDT, DTM)

### Data & Output Options
- `--csv-file <file>`: Specify custom CSV file for SKU mapping
- `--format <format>`: Output format (table, json)
- `--confirm`: Skip confirmation prompts (use with caution)
- `--backup`: Create backup file of original filename mappings

## Safety Features

### Dry-Run Mode (Default)
All operations run in preview mode by default. Use `--execute` to perform actual renames.

### Confidence Scoring
- **High (≥80%)**: Strong pattern match, safe to execute
- **Medium (50-79%)**: Reasonable match, review recommended
- **Low (<50%)**: Weak match, manual review required

### Validation Checks
- Amazon filename compliance (characters, length, format)
- Duplicate target detection
- Existing file protection
- SKU validation against product database

### Example Safety Output
```
📋 Rename Operations:
─────────────────────────────────────────────────────────────
Status  Original                           New Name              Conf.    SKU        Issues
─────────────────────────────────────────────────────────────
✅      2x1_Female_to_Female_6in_1.png     MPA-MFJ-2p-F-F-6i...  85%      MPA-MFJ-2p  
❌      unclear_connector.jpg              unclear_connector.jpg  25%                 Low confidence
✅      UF3_4pin_M_F_12in_main.png        MPA-UF3-4p-M-F-12...  90%      MPA-UF3-4p  
─────────────────────────────────────────────────────────────
```

## CSV Integration

The agent can load product data from `Amazon Product Pricing - SKU BOMs.csv` to:
- Validate generated SKUs against actual products
- Extract precise specifications from product database
- Improve pattern matching confidence
- Handle edge cases and variations

### CSV Structure Expected
```
SKU,IPN,Pin Count,Pack Size,Family 1,Connector,MPN,Cost,Qty,Ext Cost,Crimp,MPN,Cost,Qty,Ext Cost,Family 2,Connector,MPN,Cost,Qty,Ext Cost,Crimp,MPN,Cost,Qty,Ext Cost,Wire,Cost per Foot,Length,Qty (feet),Ext Cost,Material
MPA-MFJ-2p-F-F-6in-2pk,mighty-map-nod,2,2,MFJ,"(MFJ) 2x1 Conn, Rec",0469920210,$0.25,2,$0.49,(MFJ) F Crimp for Rec,0039000038,$0.03,4,$0.13,MFJ,"(MFJ) 2x1 Conn, Rec",0469920210,$0.25,2,$0.49,(MFJ) F Crimp for Rec,0039000038,$0.03,4,$0.13,"18 AWG, Silicone, Black",$0.15,6in,2.2,$0.33,$1.57
```

## Troubleshooting

### Common Issues

1. **Low Confidence Scores**
   - Filename doesn't follow recognizable patterns
   - Missing key components (pin count, connector type, length)
   - Solution: Rename manually or adjust filename to include missing info

2. **Target File Already Exists**
   - Another image already has the target name
   - Solution: Check for duplicates, consider variant naming (Main/Secondary)

3. **Amazon Compliance Errors**
   - Filename too long (>100 characters)
   - Invalid characters in filename
   - Solution: Simplify naming or fix character issues

4. **CSV Loading Failed**
   - CSV file not found or corrupted
   - Solution: Check file path and CSV format

### Debug Mode
Use `--verbose` flag to see detailed processing information:
- Pattern extraction details
- Confidence score breakdown
- CSV data matching results
- Validation check results

## Best Practices

1. **Always Start with Dry-Run**: Review all operations before executing
2. **Use Family Filtering**: Process one connector family at a time for easier review
3. **Check Confidence Scores**: Focus on high-confidence operations first
4. **Backup Important Files**: Use `--backup` for reversibility
5. **Validate Results**: Spot-check renamed files for accuracy

## Integration with Amazon Workflow

The Image Renamer Agent integrates with the broader Amazon listing workflow:

1. **Pre-Upload**: Rename images to Amazon standards before listing creation
2. **YAML Generation**: Use standardized names in product YAML configurations  
3. **Listing Creation**: Images automatically validated during listing process
4. **Bulk Operations**: Process entire product catalogs efficiently

This ensures consistency across your entire Amazon product catalog and reduces manual errors in the listing process.