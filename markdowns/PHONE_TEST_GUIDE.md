# Phone implementation and test handoff

21 November 2026. Primary device: OnePlus 11R, Chrome. This is the first local phone/PWA increment. It has not been deployed to Vercel or verified on a real phone. Supabase free-tier hosting is selected but provisioning is awaiting sign-in; Google authentication and database migration remain unimplemented.

## Start the functioning app

From PowerShell in `C:\FitnessOS`:

```powershell
.\phone.ps1
```

This uses the existing fictional demo database and port 8001. If missing, first run `python -m backend.create_demo_database`; the generator refuses to overwrite an existing file. If another server already uses the port, use `.\phone.ps1 -Port 8012` and use that port consistently below. Stop this server with Ctrl+C when finished. The script does not change firewall rules or deployment settings.

Sign in as **Demo Athlete**, password **DemoPass123!**. These are fictional testing credentials, not a hosted account. All confirmed records still save to the laptop's SQLite database.

### Preferred first test: Chrome USB forwarding

1. On the OnePlus, enable Developer options and USB debugging if comfortable doing so, connect with a data-capable USB cable, and approve the debugging connection to your own laptop. This is a user-controlled device setting; it was not enabled by the agent.
2. On desktop Chrome open `chrome://inspect/#devices`, enable Discover USB devices, and open Port forwarding.
3. Forward device port `8001` to `localhost:8001` and enable the forwarding rule.
4. In Chrome on the phone open `http://localhost:8001`. Keep the server, cable and desktop Chrome running.
5. In FitnessOS open More -> Settings -> Use on your phone. Use Install FitnessOS if offered, or Chrome's Add to Home screen / Install app action. Installability must be confirmed on the device; forwarding is a development route, not independent hosting.

See [Chrome's official forwarding instructions](https://developer.chrome.com/docs/devtools/remote-debugging/local-server). A phone's localhost normally refers to the phone itself; forwarding deliberately bridges it to the laptop. ADB is not installed in the inspected command path, so no ADB-specific setup is assumed.

### Alternative: same-network layout testing

Find the laptop's active private IPv4 address using `ipconfig`, then substitute that address:

```powershell
.\phone.ps1 -LanAddress 192.168.1.8
```

Open `http://192.168.1.8:8001` on the phone and laptop. The process binds to that interface, not localhost. The exact host/port and matching HTTP Origin are required. Setup from remote clients is denied; the demo account already exists. Never enable router port forwarding or use real records on this HTTP test path. Campus Wi-Fi isolation or local firewall policy may block it. Plain LAN HTTP does not support installation/service workers; use USB localhost testing or the future HTTPS deployment for those checks.

## Visible changes in this increment

- All five bottom items occupy one row. Log opens the existing Quick add chooser; choose a set, food, body entry or journal action there.
- More has a Sign out action; mobile header sign-out is hidden to reduce crowding. Existing tools remain reachable.
- Phone controls and form text are larger; calendars, narrow cards, record tables and long labels have bounded layouts. Desktop workspace columns and ordering remain saved as before.
- Set, food and page dialogs adapt to the phone viewport with safe-area spacing. Visual viewport changes resize the sheet; keyboard handling needs real-device confirmation.
- Route changes dismiss old dialogs. Native dialog cancel/back behavior still needs Chrome testing. No new router was introduced.
- Collapsed panel controls show only Expand outside Customize mode on phones. Custom blocks have Move to... with page/section destination choices. Move up/down labels are readable. Touch/pen no longer start desktop rectangle selection on the legacy section tree.
- Settings and sign-in show installation guidance. Manifest and two deterministic placeholder F icons are served by Python. The service worker caches only the offline notice and those icons; it never caches private HTML, records, photos, backups or API responses.
- Opening without the server shows a reconnect notice after successful service-worker installation. Offline reload cannot open your records or draft editor. An already-open page can retain drafts. Updates wait for existing tabs to close; there is no forced editor reload.
- Set, body, manual meal, water, sleep, steps, check-in and saved-food logging forms retain non-secret drafts in IndexedDB, scoped to the current local account. Recovery is explicit; Restore/Discard appears in the relevant form after reopening and signing in. Drafts are not backups and browser storage can be cleared or unavailable. Photos, credentials and arbitrary page-edit dialogs are not stored here.
- Set submissions use an idempotency request ID retained with the draft: retrying the same unconfirmed set returns the original saved record. Review pending set restores its original values before retry. Changed values cannot reuse an unconfirmed request. Server validation failures permit correction. Set retries time out after 15 seconds on browsers supporting AbortSignal.timeout; the result remains unconfirmed until retried or checked.
- Saved confirmation is shown only after the server succeeds. Set inputs lock during submission. Sign out warns before discarding device drafts. Other record types retain drafts but do not yet have retry idempotency: check History after an uncertain save before retrying.

## Acceptance checklist on the OnePlus

Record Chrome/Android version and the build being tested. Start with fictional records.

1. Sign in, open each bottom action, and reach every tool from More. Confirm five tabs remain on one row and nothing scrolls the whole page sideways.
2. Log ten sets, including Save & add another, last-value prefill, all four load adjustments, kg/lb and per-hand/total. Open the keyboard; scroll to both Save controls; rotate to landscape. Verify History and restart persistence.
3. Type a distinctive unsaved set, close/reopen the tab and restore it. Check date, units, load and workout linkage. Repeat for a meal, body measurement and journal entry. Do not treat an empty field as zero.
4. Lose connection after editing; confirm the draft remains. Reconnect and retry. For the set response-loss case, use network debugging to drop the response after the server commits; retry must add no duplicate. Do not substitute an offline-before-request test for this case.
5. Force a validation error, correct it and save. Try rapidly double-tapping Save. Check the button/input state after failure.
6. Move an Overview panel in Customize, collapse/expand, restore hidden content and reload. Move a page block into/out of a section with Move to..., then undo. Normal scrolling must never move content. Confirm desktop ordering is preserved.
7. Test Android back and dialog Close with the keyboard open. Confirm unsaved values survive; report any unexpected page exit or modal left over another route.
8. Install if offered. Launch, sign in, close/reopen, and test the offline notice. Closing the laptop/USB connection will prevent server access in this development setup.
9. Sign out with a draft and cancel; it must remain. Sign out and accept discard, sign back in; it must not be offered again. Test blocked browser storage: warn instead of claiming a stored draft.
10. Export a test backup and locate it on the phone. Restore into a separate empty test database and compare records. Retain original data until round-trip checks pass.

## Verification completed here

- 37 Python storage/request-handler tests passed, including eight phone-specific checks for allowed hosts/origins, remote setup rejection, idempotent/repeated/concurrent saves, invalid requests, account draft scope and static PWA asset serving.
- Existing set-save, voice and workspace JS behavior suites passed; new draft-controller checks cover restart recovery, same-request retry, intentional repeat, separate accounts, validation correction, blocked storage and clearing on logout.
- JavaScript syntax and Python compilation checked. Real HTTP baseline has six failures caused by WinError 10013; those are blocked, not passed. The automated browser's localhost request also timed out. No phone layout, installation or physical-keyboard result is claimed.
- Draft tests use a simulated IndexedDB transport; actual browser storage and installed Chrome behavior still require the checklist above. The existing working tree has unrelated whitespace warnings; they were not mass-reformatted.

Commands:

```powershell
python -m unittest backend.test_phone backend.test_app backend.test_features backend.test_journal backend.test_workspace_nutrition backend.test_workspace_revision -v
node frontend/test_phone_drafts.cjs
node frontend/test_set_save.cjs
node frontend/test_voice.cjs
node frontend/test_workspace_store.cjs
Get-ChildItem frontend -Filter *.js | ForEach-Object { node --check $_.FullName }
```

## Next hosted increment

Complete Supabase sign-in/connection and create the selected free project, then implement the identity/ownership/PostgreSQL migration and Python request boundary described in `HOSTING_AND_IDENTITY_PLAN.md`. The connector confirms Vercel project `aviksfitnessos` exists with a READY production deployment; this increment does not change that deployment. Switching `outputDirectory` to the real frontend before a working persistent/authenticated backend exists would break the product, so it remains unchanged.
