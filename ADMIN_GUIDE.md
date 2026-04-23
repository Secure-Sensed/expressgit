# ExpressGit Admin Console - Complete User Guide

## Overview

The Admin Console is a powerful control panel for managing shipments, tracking, customer support, and user accounts. This guide walks you through every feature with detailed steps.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard & Stats](#dashboard--stats)
3. [Shipment Inventory](#shipment-inventory)
4. [Creating Shipments](#creating-shipments)
5. [Editing Shipments](#editing-shipments)
6. [Live Location Updates](#live-location-updates)
7. [Support Inbox](#support-inbox)
8. [User Management](#user-management)
9. [Email Notifications](#email-notifications)
10. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Step 1: Access the Admin Console

1. Open your browser and navigate to `/admin-login` or click the "Admin" link
2. Enter your admin credentials:
   - **Email**: Your registered admin email
   - **Password**: Your admin account password
3. Click **Sign in**
4. You'll be redirected to the main Admin Console dashboard

### Step 2: Review the Onboarding Guide

On your first sign-in, you'll see the **Admin First Sign-In Guide** card at the top. This provides a quick overview of best practices:
- Search before creating new shipments
- Always enter receiver email for notifications
- Update location and status when shipments change
- Reply to customer support messages
- Monitor email notification status

Click **Mark as done** to dismiss this guide (you can view it again by refreshing the page and clearing your session storage).

---

## Dashboard & Stats

The dashboard displays four key metrics at the top:

### Metric Cards

| Metric | Description | Use Case |
|--------|-------------|----------|
| **Total parcels** | All shipments in the system | Understand overall volume |
| **In transit** | Shipments currently moving | Monitor active shipments |
| **Delivered** | Completed shipments | Track success rate |
| **Customers** | Distinct customer identities | Understand customer base |

### Refresh Button

- Click **Refresh data** to reload all statistics and shipment lists
- Useful after making changes to ensure you have the latest data
- Shows a spinner while loading

### Sign Out

- Click **Sign out** to end your admin session
- You'll be logged out and returned to the login page

---

## Shipment Inventory

### Finding Shipments

The **Shipment Inventory** panel on the left side lists all available shipments.

#### Search

1. In the search box, enter any of the following:
   - Tracking number (e.g., `771975185243`)
   - Reference number (e.g., `REF-INTL-1001`)
   - TCN code
   - Origin city (e.g., `Memphis`)
   - Destination city (e.g., `Los Angeles`)
   - Last known location
   - Customer email
   - Customer name

2. Results update in real-time as you type

#### Filter by Status

Use the **Filter status** dropdown to view shipments by their current status:

- **All statuses** - Show all shipments
- **Pending** - Shipments awaiting label/processing
- **In Transit** - Shipments actively moving
- **Out for Delivery** - Shipments on final delivery vehicle
- **Delivered** - Completed shipments
- **Exception** - Shipments with issues (delays, weather, etc.)
- **Created** - Newly created shipments

💡 **Tip**: Combine search and filter for precise results (e.g., search "Atlanta" + filter "Delivered")

### Selecting a Shipment

Click on any shipment in the list to:
- Load it into the detail editor on the right
- View and edit all its information
- Access its support thread messages
- Update its location

A selected shipment will show a highlighted background.

### Shipment Card Information

Each shipment card displays:
- **Tracking number** (top, small text)
- **Route** (origin → destination)
- **Location & customer** (current location and assigned email)
- **Status badge** (colored indicator: blue, green, orange, red, etc.)

---

## Creating Shipments

### Method 1: Quick Create (Recommended for Speed)

The **Quick Create** panel on the right side allows rapid shipment generation using preset values.

#### Steps

1. **Select Status Preset**
   - Click the **Status** dropdown
   - Choose a preset:
     - **Pending**: Memphis → Atlanta (3 days)
     - **In Transit**: Indianapolis → Newark (1 day)
     - **Out for Delivery**: Dallas → Austin (same day)
     - **Delivered**: Indianapolis → Atlanta (received)
     - **Exception**: Phoenix → Newark (delayed, 2 days)

2. **Enter Customer Email** (Recommended)
   - Enter the receiver's email (e.g., `customer@example.com`)
   - **Important**: Without this, no notification email will be sent
   - The customer name is auto-populated from the email

3. **Generate Parcel**
   - Click **Generate parcel**
   - A tracking number is automatically created
   - The shipment is saved to the system
   - The selected shipment updates to the newly created parcel
   - A success toast appears with the new tracking number

#### What Gets Created

- Automatic tracking number
- Status and route from the preset
- Estimated delivery date (based on preset days)
- Initial event logged (status + "Generated from quick create")
- Proof of delivery (if status is "Delivered")

### Method 2: Full Editor (For Complete Control)

Use the **Shipment Detail Editor** below Quick Create to create or edit with full control.

#### Access

- **New shipment**: Start with empty form (default state)
- **Existing shipment**: Click a shipment from inventory to load it

#### Form Fields

| Field | Description | Required |
|-------|-------------|----------|
| Tracking Number | Unique identifier | Optional (auto-generated if blank) |
| Reference Number | Optional customer or internal reference | No |
| TCN | Tracking Control Number | No |
| Status | Current status (dropdown) | Yes |
| Origin | Pickup location/city | Yes |
| Destination | Delivery location/city | Yes |
| Last Location | Current location of package | Yes |
| Origin Coordinates | Latitude/Longitude of origin | No |
| Destination Coordinates | Latitude/Longitude of destination | No |
| Current Coordinates | Current Lat/Lng during transit | No |
| Customer Email | Receiver's email for notifications | No |
| Customer Name | Receiver's name | No |
| Estimated Delivery | Expected delivery date & time | No |

#### Event Details (Optional)

Add an initial shipment event:
- **Event Title**: Description (e.g., "Shipment picked up")
- **Event Location**: Location of event
- **Event Details**: Additional notes

#### Proof of Delivery (if status = "Delivered")

- **Delivered At**: Delivery timestamp
- **Received By**: Name/title of recipient

#### Save

- **For new shipments**: Click **Save shipment**
  - Tracking number is auto-generated if not entered
  - Email notification sent if customer email provided
  
- **For existing shipments**: Click **Save shipment**
  - Updates all fields
  - Preserves existing data not explicitly changed
  - Sends notification email about the update

---

## Editing Shipments

### Opening an Existing Shipment

1. Use **Search** in Shipment Inventory to find the shipment
2. Click on it in the list
3. The detail editor populates with its current data

### Making Changes

1. Modify any field in the **Shipment Detail Editor**
2. For status changes, update the **Status** dropdown
3. To add a new event, fill in **Event Title**, **Event Location**, and **Event Details**
4. Click **Save shipment**

### Common Edit Scenarios

#### Update Status and Location
1. Find shipment by tracking number
2. Change **Status** dropdown (e.g., "In Transit" → "Out for Delivery")
3. Update **Last Location** to new city/address
4. Add an event describing the change
5. Click **Save shipment**
6. Confirmation toast appears; notification email sent if customer email exists

#### Mark as Delivered
1. Select the shipment
2. Change **Status** to "Delivered"
3. Fill in **Proof of Delivery**:
   - Set **Delivered At** to current date/time
   - Enter **Received By** name (e.g., "Front Desk")
4. Click **Save shipment**
5. Delivery notification email sent to customer

#### Assign Customer Email
1. Select the shipment
2. Scroll to **Customer Email** field
3. Enter customer email
4. Click **Save shipment**
5. Future notifications will be sent to this email

### Deleting a Shipment

1. Select the shipment from inventory
2. Scroll to bottom of detail editor
3. Click **Delete shipment** button
4. Confirm the deletion in the popup dialog
5. Shipment is removed; inventory refreshes

⚠️ **Warning**: Deletion cannot be undone. Confirm you're deleting the correct shipment.

---

## Live Location Updates

The **Live Location Update** panel provides a quick way to update a shipment's current location without opening the full editor.

### Steps

1. **Tracking Number**
   - Using selected shipment: Field auto-populated from inventory selection
   - OR type a different tracking number manually

2. **Current Location**
   - Enter the new location (e.g., "Chicago, IL" or "45 Main St, Boston, MA")
   - This becomes the shipment's "Last Location"

3. **Update Location**
   - Click **Update location**
   - System fetches existing shipment data
   - Merges in the new location
   - Saves and sends notification email
   - Success message appears

### When to Use

- Quick status updates for active shipments
- Notification of milestone locations (arrival at hub, left facility, etc.)
- Minimal data entry required

---

## Support Inbox

### Understanding Support Threads

Support threads are conversations between customers and admin tied to specific tracking numbers.

### Viewing Support Threads

The **Support Inbox** panel (lower left) shows all recent support threads:

1. Each thread displays:
   - **Tracking number** (identifier)
   - **Last message** (most recent customer or admin message preview)
   - **Timestamp** (relative time: "2 hours ago")

2. Threads are listed chronologically

3. Click any thread to:
   - Focus that shipment in the inventory
   - Load the conversation history in the **Focused thread** section
   - Prepare to reply

### Viewing a Thread Conversation

When a thread is selected, the **Focused Thread** area shows:

1. **Thread identifier** (tracking number)
2. **Message history**:
   - Customer messages appear in plain boxes
   - Admin messages appear highlighted (brighter background)
   - Each shows sender ("user" or "admin") and timestamp

3. All messages listed chronologically (oldest to newest)

### Replying to Customers

1. **Select a thread** from the list (or click a shipment, and load its thread)
2. **Read the conversation** to understand context
3. **In the reply box**, type your admin response:
   - Update customer on shipment status
   - Provide ETA information
   - Note any issues (delays, exceptions)
   - Escalate if needed
4. Click **Send admin reply**
5. Message is saved; customer-facing notification may be sent
6. Conversation history updates immediately

### Creating a New Support Thread

Support threads are automatically created when:
- A customer sends a message via the public tracking page
- An admin creates a shipment with a customer email

Manual thread creation is not needed; just reply when a thread appears.

---

## User Management

The **Registered Users** panel shows all local authentication users in your system.

### Viewing Users

Each user card displays:
- **Name** (if registered)
- **Email** (login identifier)

### Removing a User

1. Find the user in the list
2. Click **Remove** button
3. Confirm the deletion
4. User account is deleted from the system
5. That email can be re-registered later

⚠️ **Warning**: Removed users lose access to their account and cannot log back in with the same credentials.

---

## Email Notifications

### How Notifications Work

When you create or update a shipment with a customer email:

1. The system attempts to send an email notification
2. The status appears in a **toast** (popup message) at the top of your screen

### Notification Status Messages

| Message | Meaning | Action |
|---------|---------|--------|
| "Receiver email notification sent." | Email successfully delivered | None; customer notified |
| "Email notification failed: [error]" | SMTP or network error | Check email configuration |
| "No receiver email found for this shipment." | Customer email field empty | Add email and update/re-create shipment |
| "Email not configured. Set RESEND_API_KEY and MAIL_FROM to enable notifications." | Environment variables missing | See Configuration section below |

### Configuration for Email

To enable email notifications:

1. **Set environment variables** in your server:
   - `RESEND_API_KEY`: API key from Resend or email service
   - `MAIL_FROM`: Sender email address (e.g., `noreply@expressgit.com`)

2. **Restart the application** for changes to take effect

3. **Test by creating a shipment** with a valid email; check for notification

### What Email Includes

Customer notification emails typically contain:
- Tracking number
- Current status
- Estimated delivery date
- Last known location
- Link to public tracking page

---

## Troubleshooting

### Issue: Shipment Not Appearing in Search

**Solution 1**: Refresh data
- Click **Refresh data** button in top right
- Wait for load to complete

**Solution 2**: Check filter
- Ensure **Filter status** is not restricting results
- Try "All statuses" if unsure

**Solution 3**: Verify tracking number
- Shipments use exact tracking number matching
- Try partial search (e.g., "771975" instead of "771975185243")

### Issue: Email Notifications Not Sending

**Problem 1: No customer email entered**
- Ensure **Customer Email** field is filled when creating/editing

**Problem 2: Email service not configured**
- Check that `RESEND_API_KEY` and `MAIL_FROM` environment variables are set
- Verify values in your deployment platform (Vercel, local .env, etc.)
- Restart application after setting variables

**Problem 3: Invalid email format**
- Confirm customer email is a valid email address
- Common issue: typo or "Unassigned" placeholder

### Issue: Cannot Delete Shipment

**Solution 1**: Check permissions
- Confirm you're logged in as admin
- Try refreshing the page

**Solution 2**: Confirm deletion dialog
- A confirmation popup appears; click "OK" to confirm
- If missing, try again and watch for the dialog

### Issue: Admin Console Blank or Not Loading

**Solution 1**: Clear browser cache
- Press Ctrl+Shift+Delete (Cmd+Shift+Delete on Mac)
- Clear cookies and cache for your domain
- Refresh page

**Solution 2**: Check admin session
- If not logged in, you'll be redirected to login page
- Re-enter credentials and log in

**Solution 3**: Network error
- Check that backend API is running
- In browser developer console (F12), check Network tab for failed requests
- Verify server logs for errors

### Issue: Shipment Changes Not Persisting

**Problem**: Changes saved but don't appear after refresh

**Solution**:
- Verify **Save shipment** button shows success toast before leaving
- Check that no validation errors are blocking the save
- Click **Refresh data** to reload from server
- Check browser console for JavaScript errors
- Verify Supabase connection if using cloud

### Issue: Support Messages Not Loading

**Solution 1**: Select a shipment
- Support messages only show for a selected shipment
- Click a shipment from inventory
- Messages will load below

**Solution 2**: Refresh
- Click **Refresh data** to reload message list
- Wait for load to complete

**Solution 3**: Check thread exists
- Confirm the tracking number has an associated support thread
- Threads appear in the "Support inbox" list when created

---

## Best Practices

1. **Always enter customer email** when creating shipments so notifications are sent
2. **Add descriptive events** when status changes (e.g., "Arrived at sort facility")
3. **Reply to support messages promptly** to provide customer satisfaction
4. **Review stats regularly** to monitor shipment volume and delivery rates
5. **Use search filters** to find shipments before creating duplicates
6. **Test email notifications** on a test shipment after configuration changes
7. **Keep customer information accurate** (name, email, location)
8. **Monitor exceptions** and update customers on delays

---

## Keyboard Shortcuts

- **Refresh data**: Cmd/Ctrl + R (browser reload, then click Refresh button)
- **Search**: Click search box and type

---

## Support

For additional help:
- Check the **Admin First Sign-In Guide** on your dashboard
- Review form placeholder text and field descriptions
- Check backend logs if API errors occur
- Verify email configuration if notifications fail

---

**Last Updated**: April 23, 2026  
**Version**: 1.0
