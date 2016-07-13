@DataDir=wiremock @wiremock
Feature: System errors - specify messages shown in response to (simulated) connection failures etc

    Scenario: Connection timeout
        Given caseworker is using the financial status service ui
        Given the api response is delayed for 10 seconds
        When the financial status check is performed
        Then the service displays the following result page content within 6 seconds
            | Server Error        | You can’t use this service just now. The problem will be fixed as soon as possible |
            | Server Error Detail | Please try again later.                                                            |

    Scenario: Garbage response
        Given caseworker is using the financial status service ui
        Given the api response is garbage
        When the financial status check is performed
        Then the service displays the following result page content
            | Server Error        | You can’t use this service just now. The problem will be fixed as soon as possible |
            | Server Error Detail | Please try again later.                                                            |

    Scenario: Empty response
        Given caseworker is using the financial status service ui
        Given the api response is empty
        When the financial status check is performed
        Then the service displays the following result page content
            | Server Error        | You can’t use this service just now. The problem will be fixed as soon as possible |
            | Server Error Detail | Please try again later.                                                            |

    Scenario: Unexpected HTTP status
        Given caseworker is using the financial status service ui
        Given the api response has status 503
        When the financial status check is performed
        Then the service displays the following result page content
            | Server Error        | You can’t use this service just now. The problem will be fixed as soon as possible |
            | Server Error Detail | Please try again later.                                                            |

    Scenario: API down
        Given caseworker is using the financial status service ui
        Given the api is unreachable
        When the financial status check is performed
        Then the service displays the following result page content
            | Server Error        | You can’t use this service just now. The problem will be fixed as soon as possible |
            | Server Error Detail | Please try again later.                                                            |