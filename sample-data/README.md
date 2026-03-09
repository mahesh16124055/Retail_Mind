# Sample Data Files for RetailMind Testing

## Files Included

### 1. `kirana_inventory_sample.csv` (50 items)
- **Purpose**: Quick testing and demo
- **Size**: Small dataset for fast import
- **Use Case**: Initial testing, demos, presentations

### 2. `kirana_inventory_large.csv` (140 items)
- **Purpose**: Comprehensive testing
- **Size**: Large dataset with variety
- **Use Case**: Stress testing, realistic scenarios, full feature testing

## Data Format

All CSV files follow this format:
```
skuName,category,quantity,price,cost
```

### Column Descriptions:
- **skuName**: Product name (e.g., "Parle-G Gold 100g")
- **category**: Product category (e.g., "Biscuits", "Dairy", "Snacks")
- **quantity**: Current stock quantity (integer)
- **price**: Selling price in ₹ (rupees)
- **cost**: Cost price in ₹ (rupees)

## How to Import

### Method 1: Using the UI (Recommended)

1. **Login** to RetailMind
   - URL: http://retailmind-hackathon-ui.s3-website-us-east-1.amazonaws.com/
   - Credentials: `admin` / `admin123`

2. **Navigate** to Advanced Dashboard tab

3. **Click** "Import Data" button (top right)

4. **Download Template** (optional - to see format)

5. **Upload** one of the sample CSV files:
   - `kirana_inventory_sample.csv` (quick test)
   - `kirana_inventory_large.csv` (full test)

6. **Validate** - System will check data format

7. **Import** - Click "Import X Items" button

8. **Wait** for AI analysis to complete

9. **Explore** the dashboard with real data!

### Method 2: Using the Template

1. Click "Download Template" in the import dialog
2. Edit the template with your own data
3. Save as CSV
4. Upload using the same process

## Test Scenarios

### Scenario 1: Low Stock Alert Testing
**File**: `kirana_inventory_sample.csv`

**Items with Low Stock** (< 20 units):
- Amul Butter 100g: 18 units
- Amul Cheese Slices 200g: 12 units
- Mother Dairy Milk 500ml: 8 units
- Aashirvaad Atta 5kg: 15 units
- Saffola Gold Oil 1L: 10 units
- Complan 500g: 8 units
- Pantene Shampoo 340ml: 15 units
- Ariel Matic 1kg: 12 units
- Harpic Toilet Cleaner 500ml: 18 units
- Lizol Floor Cleaner 500ml: 18 units

**Expected Results**:
- ✅ "Low Stock Items" count shows 10+
- ✅ Yellow borders on low stock items
- ✅ "Low Stock" badges visible
- ✅ "Action Required" count includes these items

### Scenario 2: Critical Stock Testing
**File**: `kirana_inventory_large.csv`

**Very Low Stock** (< 10 units):
- Mother Dairy Milk 500ml: 8 units
- Amul Taaza 1L: 6 units
- Aashirvaad Atta 10kg: 8 units
- Fortune Rice Bran Oil 1L: 8 units
- Complan 500g: 8 units
- Protinex 250g: 6 units
- Gillette Mach3 Razor: 8 units
- Coca Cola 600ml: 5 units
- Pepsi 600ml: 4 units
- Sprite 600ml: 6 units
- Thums Up 600ml: 7 units
- Fanta 600ml: 5 units
- Limca 600ml: 6 units
- Mountain Dew 600ml: 4 units
- Real Juice 1L: 8 units
- Tropicana Orange 1L: 6 units
- Volini Spray 60g: 8 units

**Expected Results**:
- ✅ AI flags these as CRITICAL or HIGH risk
- ✅ Appears in "Critical Actions Needed" card
- ✅ "Reorder Now" buttons available
- ✅ WhatsApp integration works

### Scenario 3: Category Distribution Testing
**File**: `kirana_inventory_large.csv`

**Categories Included**:
- Biscuits (7 items)
- Instant Food (6 items)
- Dairy (7 items)
- Staples (8 items)
- Cooking Oil (5 items)
- Beverages (6 items)
- Health Drinks (5 items)
- Personal Care (25 items)
- Household (11 items)
- Snacks (10 items)
- Chocolates (6 items)
- Cold Drinks (7 items)
- Juices (6 items)
- Condiments (4 items)
- Spices (7 items)
- Healthcare (10 items)

**Expected Results**:
- ✅ All categories visible in dashboard
- ✅ Category-wise filtering works
- ✅ AI recommendations per category

### Scenario 4: Price Range Testing
**File**: `kirana_inventory_large.csv`

**Price Ranges**:
- Budget (₹5-20): 25 items
- Mid-range (₹21-100): 60 items
- Premium (₹101-300): 45 items
- High-end (₹301+): 10 items

**Expected Results**:
- ✅ Stock value calculation accurate
- ✅ Profit margin visible (price - cost)
- ✅ High-value items flagged appropriately

### Scenario 5: WhatsApp Integration Testing
**File**: Any file

**Steps**:
1. Import data
2. Go to Simple Dashboard
3. Find item in "Critical Actions Needed"
4. Click "Order" button
5. Select "Order via WhatsApp"

**Expected Results**:
- ✅ WhatsApp opens in new tab
- ✅ Pre-filled message in correct language
- ✅ Message includes item name
- ✅ Supplier number visible (demo: +91 9876543210)

### Scenario 6: Mark as Ordered Testing
**File**: Any file

**Steps**:
1. Import data
2. Go to Simple Dashboard
3. Find item in "Critical Actions Needed"
4. Click "Order" button
5. Select "Mark as Ordered"

**Expected Results**:
- ✅ Confirmation message appears
- ✅ Item status updated (in real app)
- ✅ Menu closes

### Scenario 7: Multi-Language Testing
**File**: Any file

**Steps**:
1. Import data
2. Toggle Hindi/English switch
3. Check all text translates
4. Test WhatsApp message in both languages

**Expected Results**:
- ✅ All UI text translates
- ✅ Metrics labels translate
- ✅ WhatsApp message in correct language
- ✅ No missing translations

### Scenario 8: Auto-Refresh Testing
**File**: Any file

**Steps**:
1. Import data
2. Go to Advanced Dashboard
3. Wait 30 seconds
4. Observe auto-refresh

**Expected Results**:
- ✅ Dashboard auto-loads on mount
- ✅ No manual button click needed
- ✅ Loading spinner shows
- ✅ Data appears automatically

## Known Test Data Characteristics

### Low Stock Items (< 20 units):
- **Sample File**: 10 items
- **Large File**: 17 items

### Categories:
- **Sample File**: 11 categories
- **Large File**: 16 categories

### Price Range:
- **Minimum**: ₹5 (Munch 11g)
- **Maximum**: ₹550 (Aashirvaad Atta 10kg)
- **Average**: ~₹120

### Stock Range:
- **Minimum**: 4 units (Pepsi, Mountain Dew)
- **Maximum**: 85 units (Maggi Noodles)
- **Average**: ~25 units

## Troubleshooting

### Import Fails
- **Check**: CSV format is correct (comma-separated)
- **Check**: All required columns present
- **Check**: No special characters in data
- **Check**: File size < 5MB

### Data Not Showing
- **Check**: Import completed successfully
- **Check**: Correct store selected
- **Check**: Refresh browser
- **Check**: Check browser console for errors

### Low Stock Not Detected
- **Check**: Threshold is 20 units
- **Check**: Items have quantity < 20
- **Check**: Dashboard refreshed after import

### WhatsApp Not Opening
- **Check**: Browser allows popups
- **Check**: WhatsApp installed or web.whatsapp.com accessible
- **Check**: Internet connection active

## Tips for Best Results

1. **Start Small**: Use `kirana_inventory_sample.csv` first
2. **Test Features**: Try all buttons and actions
3. **Check Languages**: Toggle Hindi/English
4. **Test AI Chat**: Ask questions about inventory
5. **Explore Tabs**: Check all three dashboard tabs
6. **Test Filters**: Use advanced filters on data
7. **Export Data**: Try export functionality
8. **Multi-Store**: Test with different stores

## Creating Custom Data

### Template:
```csv
skuName,category,quantity,price,cost
Your Product Name,Category,50,100,80
```

### Rules:
- **skuName**: Any text, avoid commas
- **category**: Any text, consistent naming
- **quantity**: Positive integer
- **price**: Positive number (selling price)
- **cost**: Positive number (< price for profit)

### Tips:
- Use realistic Indian product names
- Include variety of categories
- Mix high and low stock items
- Include different price ranges
- Test edge cases (very low stock, high prices)

## Support

For issues or questions:
- Check browser console for errors
- Verify CSV format matches template
- Try with sample files first
- Clear browser cache if needed

---

**Happy Testing!** 🚀

These sample files will help you explore all features of RetailMind and see how AI-powered inventory intelligence works for Indian Kirana stores.
