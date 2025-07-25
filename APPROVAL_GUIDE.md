# How to Get Your SP-API Application Approved

## Current Problem
Your SP-API application is in "Draft" status, which means:
- ✅ Read APIs work (catalog, inventory, orders)
- ❌ Upload/Write APIs are blocked (image uploads, listing creation)

## Step-by-Step Approval Process

### Step 1: Check Your Application Status
1. Go to [Amazon Seller Central](https://sellercentral.amazon.com)
2. Navigate to one of these locations (Amazon has updated their interface):
   - **Apps & Services** → **Manage Your Apps** 
   - **Settings** → **Account Info** → **Seller Partner API**
   - **Partners** → **Developer Central** 
   - **Settings** → **User Permissions** (look for API or Developer section)
3. Find your application: **"Admin Dash"**
4. Look for the status - it should say "Draft", "Pending", or "Under Review"

### Step 2: Look for Approval Options
In your application details, look for one of these buttons/options:
- **"Submit for Review"**
- **"Request Production Access"** 
- **"Apply for Production"**
- **"Publish Application"**

### Step 3: Fill Out Application Details
Amazon typically requires:

#### A. Application Information
- **Application Name**: Admin Dash (already set)
- **Description**: "Internal tool for MiniProto to automate Amazon product listing creation for wire harness products"
- **Use Case**: "Streamline inventory management and product catalog maintenance"

#### B. API Permissions Needed
Make sure these are selected:
- ✅ **Catalog Items API** (reading/searching products)
- ✅ **Listings Items API** (creating/updating listings)  
- ✅ **Uploads API** (uploading product images)
- ✅ **FBA Inventory API** (inventory management)
- ✅ **Orders API** (order processing)

#### C. Business Justification
Example text:
```
"MiniProto manufactures custom wire harnesses and cables. This internal application automates the creation and management of product listings on Amazon, reducing manual data entry from 30+ minutes per product to under 1 minute. This improves accuracy, reduces errors, and allows faster time-to-market for new products."
```

#### D. Technical Information
- **Data Usage**: "Internal automation only - no customer data collection"
- **Security**: "Application runs on internal systems with secure credential storage"
- **Volume**: "Approximately 10-50 product listings per month"

### Step 4: Submit and Wait
- Click **"Submit for Review"** or equivalent
- Amazon review process: **2-7 business days**
- You'll receive email notifications about status changes

## If Your App Isn't Listed

If your SP-API application doesn't appear in "Manage Your Apps", try these:

### Option A: Check Developer Console Directly
1. Go to [Amazon Developer Console](https://developer.amazon.com/dashboard)
2. Look for **"Selling Partner API"** or **"SP-API"** section
3. Find your "Admin Dash" application there
4. Check if there are approval/production options

### Option B: Check API Integration Section
1. In Seller Central: **Settings** → **Account Info**
2. Look for **"API Integration"** or **"Developer APIs"**
3. Check for SP-API or third-party API settings

### Option C: Your App May Already Be Approved
Sometimes applications are approved but you need to generate new credentials:

1. In your application details, look for:
   - **"Production" section** (separate from Sandbox)
   - **"Generate Production Keys"** button
   - **"Production Refresh Token"** option

2. Check for different credential sets:
   - **Sandbox credentials** (what you're using now)
   - **Production credentials** (different Client ID/Secret)

Look for tabs or sections labeled:
- "Sandbox" vs "Production"
- "Development" vs "Live"
- "Test" vs "Production"

## What to Look For

### If Application is Still Draft:
- Submit it for review using the steps above
- Wait for Amazon approval

### If Application is Approved:
- Look for production-specific credentials
- Generate new production refresh token
- Update your .env file with production credentials

## Common Issues

### 1. Missing Business Verification
- Amazon may require business verification first
- Check **Settings** → **Account Info** → **Business Information**

### 2. Incomplete Application
- Make sure all required fields are filled
- Add clear business justification
- Specify exact API permissions needed

### 3. Wrong Application Type
- Make sure you're using "SP-API" not legacy "MWS"
- Check you're in the right developer console section

## Next Steps After Approval

Once approved, you'll be able to:
1. Generate production refresh token
2. Update your .env file
3. Run: `npx tsx cli/index.ts create test-production-harness-v2.yaml --verbose`
4. Create real Amazon listings! 🚀

## Need Help?

If you can't find the approval options:
1. Take screenshots of your application details page
2. Look for any "Help" or "Support" links in Seller Central
3. Check for pending notifications or action items in your account