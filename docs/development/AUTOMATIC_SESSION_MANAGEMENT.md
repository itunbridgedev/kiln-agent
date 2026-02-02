# Automatic Session Management

## Overview

The system automatically manages class sessions through schedule patterns to ensure future sessions are always available without manual intervention.

## How It Works

### 1. Automatic Session Generation on Pattern Creation

When you create a new schedule pattern, sessions are **automatically generated** based on the recurrence rule. You no longer need to click "Generate Sessions" manually.

**Example:**

- Create a pattern for "Beginner Wheel Throwing"
- Pattern: Every Monday at 10 AM for 6 months
- Sessions are automatically created immediately

### 2. Automatic Session Extension

A background script (`scripts/extend-schedule-sessions.ts`) automatically:

- Checks all active schedule patterns
- Ensures there are always **6 months of future sessions** available
- Deletes past sessions to keep the database clean
- Generates new sessions as time passes

**Default Settings:**

- Maintains sessions **6 months into the future**
- Triggers extension when sessions are **less than 3 months out**
- Runs automatically via scheduled job

## Setup

### Local Development

Run the script manually:

```bash
npm run schedule:extend
```

### Production (Heroku)

Set up a daily scheduled job using Heroku Scheduler:

1. Add Heroku Scheduler addon:

   ```bash
   heroku addons:create scheduler:standard --app your-app-name
   ```

2. Configure the job:

   ```bash
   heroku addons:open scheduler --app your-app-name
   ```

3. Add a new job with:
   - **Command:** `npm run schedule:extend`
   - **Frequency:** Daily at a low-traffic time (e.g., 3:00 AM)

### Alternative: Cron Job (VPS/Server)

Add to your crontab:

```bash
# Run daily at 3:00 AM
0 3 * * * cd /path/to/pottery-studio-app && npm run schedule:extend >> /var/log/extend-sessions.log 2>&1
```

## Configuration

To adjust how far into the future sessions are generated, edit `scripts/extend-schedule-sessions.ts`:

```typescript
const FUTURE_MONTHS = 6; // Change this value (e.g., 12 for 1 year)
```

## How Sessions are Extended

1. **Check:** Script finds all active patterns
2. **Analyze:** For each pattern, checks the latest scheduled session
3. **Extend:** If latest session is < 3 months out:
   - Deletes past sessions (< today)
   - Generates new sessions up to FUTURE_MONTHS ahead
4. **Respect End Dates:** Won't generate sessions past pattern's endDate

## Pattern End Dates

- **No End Date:** Sessions continue indefinitely (renewed every 3 months)
- **With End Date:** Sessions only generated until that date
- **Past End Date:** Pattern is skipped (no new sessions)

## Monitoring

Check the logs to see session generation activity:

```bash
# Heroku
heroku logs --tail --app your-app-name | grep "Extend Sessions"

# Local
npm run schedule:extend
```

## Manual Session Management

If needed, you can still:

- Click "Generate Sessions" button to force regeneration
- Delete individual sessions
- Deactivate patterns to stop new sessions
- Adjust pattern settings and regenerate

## Best Practices

1. **Set reasonable end dates** for time-limited courses
2. **Leave end date empty** for ongoing classes
3. **Run script daily** in production for consistent availability
4. **Monitor logs** during initial setup to ensure proper operation
5. **Test locally** before deploying to production
