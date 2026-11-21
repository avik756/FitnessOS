/* Included only by the hosted Python handler. Local wording and behavior stay local. */
window.FITNESSOS_HOSTED = true;
(() => {
  const intro = document.querySelector('[data-view="home"] .page-heading p');
  if (intro) intro.textContent = 'Your records are saved to your private account. Keep an exported backup too.';
  const exerciseIntro = document.querySelector('[data-view="exercises"] .page-heading p');
  if (exerciseIntro) exerciseIntro.textContent = 'Keep your most used exercises close. Favorites are saved to your account.';
  const backupIntro = document.querySelector('[data-view="backup"] .page-heading p');
  if (backupIntro) backupIntro.textContent = 'Download a backup and verify recovery before relying on the app for personal records.';
  const backupText = document.querySelector('.backup > p');
  if (backupText) backupText.textContent = 'Download your sets, favorites, body, meals, journal, foods, workouts and workspace as JSON. Restore previews the file and requires an empty account. Hosted backups cannot include photos and uploads are limited to 3.5 MB. Downloaded JSON is not encrypted. Credentials are never exported.';
  const unlock = document.querySelector('#backup-unlock-form');
  if (unlock) unlock.hidden = true;
})();
