// ==UserScript==
// @name         UniFi Alerts in New UI
// @namespace    http://tampermonkey.net/
// @version      0.6
// @description  Restore Alerts to the new UniFi UI
// @author       Jeffrey Brite
// @match        https://unifi.techcollective.com/*
// @grant        none
// ==/UserScript==


(function () {
    'use strict';

    const match = window.location.pathname.match(/\/manage\/(?:site\/)?([^/]+)/);
    if (!match) {
        console.log('[TM Alerts] Site ID not found in path:', window.location.pathname);
        return;
    }
    const siteId = match[1];

    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content ||
                      document.cookie.match(/csrf_token=([^;]+)/)?.[1];

    function waitForSidebar() {
        const check = setInterval(() => {
            const sidebarGroups = document.querySelectorAll('ul.group__mrq0H5WB');
            if (sidebarGroups.length > 1) {
                clearInterval(check);
                const bottomGroup = sidebarGroups[sidebarGroups.length - 1];
                injectIcon(bottomGroup);
            }
        }, 500);
    }

    function injectIcon(targetUl) {

        if (document.getElementById('tm-alerts-styled')) return;

        const li = document.createElement('li');
        li.className = 'item__rHEvxowz item-auto__rHEvxowz';
        li.style.cursor = 'pointer';

        const containerDiv = document.createElement('div');
        containerDiv.className = 'container__XnIXscP4 hoverable__XnIXscP4 cursor-pointer__XnIXscP4';

        const anchor = document.createElement('a');
        anchor.onclick = () => {
            console.log('[TM Alerts] Alert icon clicked');
            loadAlerts();
        };
        anchor.id = 'tm-alerts-styled';
        anchor.className = 'component__rHEvxowz icon-dark__rHEvxowz is-accessible__rHEvxowz';
        anchor.title = 'Alerts';
        anchor.innerHTML = `
            <svg viewBox="0 0 24 24" version="1.1" xmlns="http://www.w3.org/2000/svg"
                class="ubntIcon ubntIcon--navigation" style="width: 24px; height: 24px;">
                <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                    <g stroke="currentColor">
                        <path d="M1.52311199,19.5 L22.476888,19.5 L21.5153009,18.792417 C20.4416371,18.0023626 19.8076923,16.7487936 19.8076923,15.4157746 L19.8076923,8.1509434 C19.8076923,3.92759825 16.3141787,0.5 12,0.5 C7.6858213,0.5 4.19230769,3.92759825 4.19230769,8.1509434 L4.19230769,15.4157746 C4.19230769,16.7487936 3.55836286,18.0023626 2.48469914,18.792417 L1.52311199,19.5 Z" stroke="currentColor"></path>
                        <path d="M9,21 L10,21 C10,22.1045695 10.8954305,23 12,23 C13.1045695,23 14,22.1045695 14,21 L15,21 C15,22.6568542 13.6568542,24 12,24 C10.3431458,24 9,22.6568542 9,21 Z" fill="currentColor" fill-rule="nonzero"></path>
                    </g>
                </g>
            </svg>
        `;

        anchor.onclick = () => loadAlerts();

        containerDiv.appendChild(anchor);
        li.appendChild(containerDiv);
        targetUl.appendChild(li);
    }

    function loadAlerts() {
        fetch(`/api/s/${siteId}/stat/alarm`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Csrf-Token': csrfToken
            },
            credentials: 'include',
            body: '{}'
        })
            .then(res => res.json())
            .then(data => {
            if (!data.data) throw new Error('No alerts in response');
            renderFullPage(data.data);
        })
            .catch(err => {
            console.error('Failed to load alerts:', err);
            alert('Failed to fetch alerts. See DevTools console for error.');
        });
    }

    function renderFullPage(alerts) {
        const container = document.querySelector('.css-network-1bffbg6');
        if (!container) {
            console.warn('[TM Alerts] Content wrapper not found.');
            return;
        }

        const children = Array.from(container.children);
        const contentArea = children.find(el => el.tagName !== 'NAV');
        if (!contentArea) {
            console.warn('[TM Alerts] Could not locate content area.');
            return;
        }

        const newContent = document.createElement('div');
        newContent.style = 'padding: 24px; color: white; font-family: sans-serif; overflow-y: auto; height: 100%;';
        newContent.innerHTML = `
        <h1 style="font-size: 24px; margin-bottom: 16px;">📢 UniFi Alerts</h1>
        <table style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr style="text-align: left; border-bottom: 2px solid #444;">
                    <th style="padding: 8px;">Alert Type</th>
                    <th style="padding: 8px;">Time</th>
                    <th style="padding: 8px;">Message</th>
                </tr>
            </thead>
            <tbody>
                ${alerts.map((alert, i) => `
                    <tr class="alert-row" style="border-bottom: 1px solid #333; cursor: pointer;" data-index="${i}">
                        <td style="padding: 8px;">${alert.key}</td>
                        <td style="padding: 8px;">${new Date(alert.time).toLocaleString()}</td>
                        <td style="padding: 8px;">${alert.msg || ''}</td>
                    </tr>
                    <tr class="alert-detail" style="display: none; background: #1b1b1b;">
                        <td colspan="3" style="padding: 8px; border-top: 1px solid #222;">
                            <pre style="white-space: pre-wrap; font-size: 13px;">${JSON.stringify(alert, null, 2)}</pre>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

        // Replace only the content area
        contentArea.replaceWith(newContent);

        // Attach row toggles
        newContent.querySelectorAll('.alert-row').forEach(row => {
            row.addEventListener('click', () => {
                const next = row.nextElementSibling;
                if (next && next.classList.contains('alert-detail')) {
                    next.style.display = next.style.display === 'none' ? 'table-row' : 'none';
                }
            });
        });
    }

    waitForSidebar();
})();
