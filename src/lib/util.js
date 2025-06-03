/**
 * Changes the favicon and title of the page
 * @param {string} title - The new page title
 * @param {string} emoji - The emoji to use as favicon
 */
export function setDemoTitle(title, emoji) {
	document.title = title;

	const favicon = document.querySelector("link[rel='icon']");
	if (favicon) {
		favicon.href = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>${emoji}</text></svg>`;
	}
}
