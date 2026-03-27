export const success = (data, message = "success") => ({
    status: true,
    message,
    data
});

export const error = (message = "error") => ({
    status: false,
    message
});