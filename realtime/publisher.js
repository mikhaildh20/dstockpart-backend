import realtimeBus from "./event-bus.js";

export const publishDashboardUpdate = (payload = {}) => {
    realtimeBus.emit("dashboard:update", {
        at: new Date().toISOString(),
        ...payload,
    });
};
