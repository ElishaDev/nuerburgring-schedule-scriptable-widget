const logoPngUrl = "https://raw.githubusercontent.com/ElishaDev/nuerburgring-schedule-scriptable-widget/main/assets/nuerburgring-outline.png";

async function fetchOpenHours() {
    const url = "https://nuerburgring.de/open-hours#event-inline-12";
    const req = new Request(url);
    const html = await req.loadString();

    const scheduleMatch = html.match(/data-schedule="([^"]+)"/);
    if (!scheduleMatch) {
        throw new Error("data-schedule not found");
    }

    const scheduleJson = JSON.parse(decodeEntities(scheduleMatch[1]));

    const formatStatus = (entry) => {
        if (!entry || (!entry.opened && (!entry.exclusion || !entry.exclusion.opened))) {
            return {
                text: "Closed",
                color: Color.red()
            };
        }

        const periods = entry.exclusion?.periods ?? entry.periods ?? [];
        if (periods.length === 0) {
            return {
                text: "Closed",
                color: Color.red()
            };
        }

        const times = periods.map(p => `${p.start} - ${p.end}`).join(", ");
        return {
            text: `Open: ${times}`,
            color: Color.green()
        };
    };

    const todayKey = getDateKey(0);
    const tomorrowKey = getDateKey(1);

    return {
        today: formatStatus(scheduleJson[todayKey]),
        tomorrow: formatStatus(scheduleJson[tomorrowKey])
    };
}

function getDateKey(offsetDays) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().split("T")[0];
}

function decodeEntities(str) {
    return str.replace(/&quot;/g, '"')
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&#39;/g, "'");
}

async function loadBackgroundImage(url) {
    let req = new Request(url);
    return await req.loadImage();
}

async function main() {
    try {
        let openHours = await fetchOpenHours();
        let bgImage = await loadBackgroundImage(logoPngUrl);

        let widget = new ListWidget();

        let drawing = new DrawContext();
        drawing.size = new Size(300, 300);
        drawing.opaque = false;
        drawing.respectScreenScale = true;
        drawing.drawImageInRect(bgImage, new Rect(20, 20, 260, 260));
        drawing.setFillColor(new Color("#1c1c1e", 0.85));
        drawing.fillRect(new Rect(0, 0, 300, 300));

        widget.backgroundImage = drawing.getImage();
        widget.setPadding(10, 12, 10, 12);

        let title = widget.addText("Track Schedule\nNordschleife");
        title.font = Font.boldSystemFont(12);
        title.textColor = Color.white();
        title.minimumScaleFactor = 0.8;

        widget.addSpacer(4);

        let todayTitle = widget.addText("Today:");
        todayTitle.font = Font.semiboldSystemFont(10);
        todayTitle.textColor = Color.white();
        let todayTimes = widget.addText(openHours.today.text);
        todayTimes.font = Font.mediumSystemFont(10);
        todayTimes.textColor = openHours.today.color;

        widget.addSpacer(4);

        let tomorrowTitle = widget.addText("Tomorrow:");
        tomorrowTitle.font = Font.semiboldSystemFont(10);
        tomorrowTitle.textColor = Color.white();
        let tomorrowTimes = widget.addText(openHours.tomorrow.text);
        tomorrowTimes.font = Font.mediumSystemFont(10);
        tomorrowTimes.textColor = openHours.tomorrow.color;

        if (config.runsInWidget) {
            Script.setWidget(widget);
        } else {
            await widget.presentSmall();
        }

        Script.complete();
    } catch (error) {
        console.error(error);
    }
}

await main();
