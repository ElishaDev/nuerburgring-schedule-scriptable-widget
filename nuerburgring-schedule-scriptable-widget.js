const logoPngUrl = "https://raw.githubusercontent.com/ElishaDev/nuerburgring-schedule-scriptable-widget/main/assets/nuerburgring-outline.png";

async function fetchOpenHours() {
    const url = "https://nuerburgring.de/open-hours";
    const req = new Request(url);
    const html = await req.loadString();

    const match = html.match(
        /id="event-inline-12"[\s\S]*?<div class="js-datepicker-div--oh hasDatepicker"[^>]*data-location-id="12"[^>]*data-schedule="([^"]+)"/
    );

    if (!match) {
        throw new Error("Nordschleife schedule data not found");
    }

    const scheduleJson = JSON.parse(decodeHtmlEntities(match[1]));

    const todayKey = getLocalDateKey(0);
    const tomorrowKey = getLocalDateKey(1);

    return {
        today: formatStatus(scheduleJson[todayKey]),
        tomorrow: formatStatus(scheduleJson[tomorrowKey]),
    };
}

function formatStatus(entry) {
    if (!entry) {
        return { text: "No data", color: Color.orange() };
    }

    const source = entry.exclusion ?? entry;
    const isOpen = source.opened === true || source.status === "opened";
    const periods = Array.isArray(source.periods) ? source.periods : [];
    const message = source.message?.en || source.message?.de || null;

    if (!isOpen || periods.length === 0) {
        return {
            text: message ? `Closed (${message})` : "Closed",
            color: Color.red(),
        };
    }

    const times = periods.map(p => `${p.start} - ${p.end}`).join(", ");

    return {
        text: message ? `${times} (${message})` : times,
        color: Color.green(),
    };
}

function getLocalDateKey(offsetDays) {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + offsetDays);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function decodeHtmlEntities(str) {
    return str
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&#39;/g, "'")
        .replace(/&#x2F;/g, "/");
}

async function loadBackgroundImage(url) {
    const req = new Request(url);
    return await req.loadImage();
}

async function main() {
    try {
        const openHours = await fetchOpenHours();
        const bgImage = await loadBackgroundImage(logoPngUrl);

        const widget = new ListWidget();

        const drawing = new DrawContext();
        drawing.size = new Size(300, 300);
        drawing.opaque = false;
        drawing.respectScreenScale = true;

        drawing.drawImageInRect(bgImage, new Rect(20, 20, 260, 260));
        drawing.setFillColor(new Color("#1c1c1e", 0.85));
        drawing.fillRect(new Rect(0, 0, 300, 300));

        widget.backgroundImage = drawing.getImage();
        widget.setPadding(10, 12, 10, 12);

        const title = widget.addText("Track Schedule\nNordschleife");
        title.font = Font.boldSystemFont(12);
        title.textColor = Color.white();
        title.minimumScaleFactor = 0.8;

        widget.addSpacer(6);

        const todayTitle = widget.addText("Today:");
        todayTitle.font = Font.semiboldSystemFont(10);
        todayTitle.textColor = Color.white();

        const todayTimes = widget.addText(openHours.today.text);
        todayTimes.font = Font.mediumSystemFont(10);
        todayTimes.textColor = openHours.today.color;
        todayTimes.minimumScaleFactor = 0.7;
        todayTimes.lineLimit = 3;

        widget.addSpacer(4);

        const tomorrowTitle = widget.addText("Tomorrow:");
        tomorrowTitle.font = Font.semiboldSystemFont(10);
        tomorrowTitle.textColor = Color.white();

        const tomorrowTimes = widget.addText(openHours.tomorrow.text);
        tomorrowTimes.font = Font.mediumSystemFont(10);
        tomorrowTimes.textColor = openHours.tomorrow.color;
        tomorrowTimes.minimumScaleFactor = 0.7;
        tomorrowTimes.lineLimit = 3;

        if (config.runsInWidget) {
            Script.setWidget(widget);
        } else {
            await widget.presentSmall();
        }

        Script.complete();
    } catch (error) {
        console.error(error);
        const widget = new ListWidget();
        widget.addText("Nordschleife");
        widget.addSpacer(4);
        const err = widget.addText("Failed to load schedule");
        err.textColor = Color.red();

        if (config.runsInWidget) {
            Script.setWidget(widget);
        } else {
            await widget.presentSmall();
        }

        Script.complete();
    }
}

await main();