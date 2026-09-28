class ApiError(Exception):
    def __init__(self, status, code, message, details=None):
        super().__init__(message)
        self.status = status
        self.code = code
        self.details = details


def invalid(field, message="Enter a valid value."):
    raise ApiError(
        400,
        "VALIDATION_ERROR",
        "The request contains invalid values.",
        [{"field": field, "message": message}],
    )


def missing(resource):
    raise ApiError(
        404,
        f"{resource.upper()}_NOT_FOUND",
        f"{resource.replace('_', ' ').capitalize()} not found.",
    )
