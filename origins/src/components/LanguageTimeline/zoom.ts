import * as d3 from 'd3';

export type FitResult = {
    height: number;
    initial: d3.ZoomTransform;
    calculatedTargetWidth: number;
};


const ZOOM_K_MIN = 0.1;
const ZOOM_K_MAX = 3;

const getTargetWidth = (contentW: number, contentH: number): number => {
    const ratio = contentW / contentH;
    const minFrac = 0.6;
    const maxFrac = 0.9;

    const t = Math.max(0, Math.min(1, (ratio - 0.8) / (2.0 - 0.8)));
    const frac = minFrac + (maxFrac - minFrac) * t;

    const targetWidth = Math.max(700, Math.min(window.innerWidth * frac, 1200));

    return targetWidth;
}

export const computeFitTransform = (args: {
    box: DOMRect | SVGRect;
    targetWidth: number;
}): FitResult => {
    const MAX_VIEWPORT_H = 800;
    const { box, targetWidth } = args;

    const padding = 40;
    const contentH = Math.max(1, box.height);
    const contentW = Math.max(1, box.width);
    const availableW = Math.max(1, targetWidth - padding * 2);
    const availableH = Math.max(1, MAX_VIEWPORT_H - padding * 2);
    const kFitW = availableW / contentW;
    const kFitH = availableH / contentH;
    const kRaw = Math.min(kFitW, kFitH);
    const calculatedTargetWidth = getTargetWidth(contentW, contentH);
    const k = Math.max(ZOOM_K_MIN, Math.min(kRaw, ZOOM_K_MAX));
    const tx = (calculatedTargetWidth - contentW * k) / 2 - box.x * k;
    const ty = padding - box.y * k;
    const initial = d3.zoomIdentity.translate(tx, ty).scale(k);
    const height = MAX_VIEWPORT_H;

    return { height, initial, calculatedTargetWidth }

}

export const createTimelineZoom = (args: {
    viewportSelect: d3.Selection<SVGGElement, unknown, null, undefined>;
    box: DOMRect | SVGRect;
    targetWidth: number;
    height: number;
}): d3.ZoomBehavior<SVGSVGElement, unknown> => {

    const {viewportSelect, box, targetWidth, height } = args;




    const zoom = d3.zoom<SVGSVGElement, unknown>()
        .filter((event: any) => {
            if (event.type === 'mousedown') return true;
            if (event.type === 'wheel') return event.shiftKey || event.metaKey;
            if (event.type.startsWith('touch')) return true
            return true;
        })
        .scaleExtent([ZOOM_K_MIN, ZOOM_K_MAX])
        .extent([[0, 0], [targetWidth, height]])
        .wheelDelta((event: WheelEvent) => {
            return -event.deltaY * 0.00055;
        })
        .on('zoom', (event) => {
            const t = event.transform;
            const k = t.k;
            const viewportH = Math.max(320, height);
            let minY = viewportH - (box.y + box.height + 40) * k;
            let maxY = -(box.y - 40) * k;
            if (minY > maxY) {
                const lockedY = (minY + maxY) / 2;
                minY = lockedY;
                maxY = lockedY;
            }
            const clampedY = Math.max(minY, Math.min(maxY, t.y));
            const clamped = d3.zoomIdentity.translate(t.x, clampedY).scale(k);
            viewportSelect.attr('transform', clamped.toString());
        });
    return zoom;
}


export const cleanupZoom = (
    svgSelect: d3.Selection<SVGSVGElement, unknown, null, undefined>
): void => {
    svgSelect.on('.zoom', null);
}