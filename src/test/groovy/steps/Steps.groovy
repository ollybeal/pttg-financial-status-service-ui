package steps

import cucumber.api.DataTable
import cucumber.api.Scenario
import cucumber.api.java.After
import cucumber.api.java.Before
import cucumber.api.java.en.Given
import cucumber.api.java.en.Then
import cucumber.api.java.en.When
import groovy.json.JsonSlurper
import net.thucydides.core.annotations.Managed
import org.openqa.selenium.By
import org.openqa.selenium.WebDriver
import org.openqa.selenium.WebElement
import org.slf4j.Logger
import org.slf4j.LoggerFactory

import static steps.UtilitySteps.clickRadioButton
import static steps.UtilitySteps.toCamelCase
/**
 * @Author Home Office Digital
 */
class Steps {

    private static Logger LOGGER = LoggerFactory.getLogger(Steps.class);

    @Managed
    WebDriver driver;
    private def delay = 500

    def uiHost = "localhost"
    def uiPort = 8001
    def uiUrl = "http://$uiHost:$uiPort/"

    def barclaysStubHost = "localhost"
    def barclaysStubPort = 8082
    def testDataLoader

    def pageLocations = [
        'queryPage'   : '#/financial-status-query',
        'resultsPage' : '#/financial-status-result',
        'noRecordPage': '#/financial-status-no-record'
    ]

    def sortCodeParts = ["First", "Second", "Third"]
    def sortCodeDelimiter = "-"

    def dateParts = ["Day", "Month", "Year"]
    def dateDelimiter = "/"

    def innerLondonRadio = new UtilitySteps.RadioButtonConfig()
        .withOption('Yes', 'innerLondonBorough-1')
        .withOption('No', 'innerLondonBorough-2')

    @Before
    def setUp(Scenario scenario) {

        checkPrerequisites()

        // todo is there a hook to allow setup before all scenarios in this feature?
        testDataLoader = new TestDataLoader(barclaysStubHost, barclaysStubPort)
        testDataLoader.prepareFor(scenario)
    }

    @After
    def tearDown() {
        testDataLoader?.clearTestData()
    }

    private def checkPrerequisites() {

        String healthCheckText = readHealthCheck()
        def health = new JsonSlurper().parseText(healthCheckText)

        assert health.status == "UP": "Health check failure. Are the UI, API and STUB all running? Healthcheck said: $healthCheckText"
    }

    private String readHealthCheck() {

        try {
            def healthCheckUrl = uiUrl + "health"
            return healthCheckUrl.toURL().text
        } catch (Exception e) {
            e.printStackTrace()
            assert false: "Could not connect to UI server at $healthCheckUrl. Is it running?"
        }
    }

    def sendKeys(WebElement element, String v) {
        element.clear();
        if (v != null && v.length() != 0) {
            element.sendKeys(v);
        }
    }

    private def fillOrClearBySplitting(String key, String input, List<String> partNames, String delimiter) {

        if (input != null && input.length() != 0) {
            fillPartsBySplitting(key, input, delimiter, partNames)

        } else {
            clearParts(key, partNames)
        }
    }

    private def fillPartsBySplitting(String key, String value, String delimiter, List<String> partNames) {

        String[] parts = value.split(delimiter)

        parts.eachWithIndex { part, index ->
            sendKeys(driver.findElement(By.id(key + partNames[index])), part)
        }
    }

    private def clearParts(String key, List<String> partNames) {
        partNames.each { part ->
            driver.findElement(By.id(key + part)).clear()
        }
    }

    private def assertCurrentPage(String location) {

        driver.sleep(200)

        def expected = pageLocations[location]
        def actual = driver.currentUrl
        driver.sleep(2500)
        assert actual.contains(expected): "Expected current page location to contain text: '$expected' but actual page location was '$actual' - Something probably went wrong earlier"
    }

    private void verifyTableRowHeadersInOrder(DataTable expectedResult, tableId) {

        WebElement tableElement = driver.findElement(By.id(tableId))

        def entriesAsList = expectedResult.asList(String.class)

        entriesAsList.eachWithIndex { v, index ->
            def oneBasedIndex = index + 1;
            def result = tableElement.findElements(By.xpath(".//tbody/tr[$oneBasedIndex]/th[contains(., '$v')]"))
            assert result: "Could not find header [$v] for Results table row, [$oneBasedIndex] "
        }
    }

    private void assertTextFieldEqualityForMap(DataTable expectedResult) {
        Map<String, String> entries = expectedResult.asMap(String.class, String.class)

        entries.each { k, v ->

            String fieldName = toCamelCase(k);

            WebElement element = driver.findElement(By.id(fieldName))

            assert v.contains(element.getText())
        }
    }

    @Given("^(?:caseworker|user) is using the financial status service ui\$")
    public void user_is_using_the_financial_status_service_ui() throws Throwable {
        driver.get(uiUrl)
        assertCurrentPage('queryPage')
    }

    @Given("^the test data for account (.+)\$")
    public void the_test_data_for_account_number(String fileName) {
        testDataLoader.loadTestData(fileName)
    }

    @When("^the financial status check is performed with\$")
    public void the_financial_status_check_is_performed_with(DataTable arg1) throws Throwable {

        assertCurrentPage('queryPage')

        Map<String, String> entries = arg1.asMap(String.class, String.class)

        entries.each { k, v ->
            String key = toCamelCase(k)

            if (key.endsWith("Date")) {
                fillOrClearBySplitting(key, v, dateParts, dateDelimiter)

            } else if (key.equals("sortCode")) {
                fillOrClearBySplitting(key, v, sortCodeParts, sortCodeDelimiter)

            } else {
                def element = driver.findElement(By.id(key))

                if (key == "innerLondonBorough") {
                    clickRadioButton(driver, innerLondonRadio, v)

                } else {
                    sendKeys(element, v)
                }

            }
        }

        driver.sleep(delay)
        driver.findElement(By.className("button")).click()
    }


    @When("^the caseworker views the query page\$")
    public void the_caseworker_views_the_query_page() throws Throwable {

        driver.get(uiUrl)
        assertCurrentPage('queryPage')
    }

    @Then("^the service displays the following message\$")
    public void the_service_displays_the_following_message(DataTable arg1) throws Throwable {

        assertCurrentPage('queryPage')

        Map<String, String> entries = arg1.asMap(String.class, String.class)

        assert driver.findElement(By.id(entries.get("Error Field"))).getText() == entries.get("Error Message")
    }

    @Then("^the service displays the query page\$")
    public void the_service_displays_the_query_page(DataTable expectedResult) throws Throwable {

        assertCurrentPage('queryPage')

        assertTextFieldEqualityForMap(expectedResult)
    }

    @Then("^the service displays the account not found page\$")
    public void the_service_displays_the_account_not_found_page(DataTable expectedResult) throws Throwable {

        assertCurrentPage('noRecordPage')

        assertTextFieldEqualityForMap(expectedResult)
    }

    @Then("^the service displays the following your search data\$")
    public void the_service_displays_the_following_your_search_date(DataTable expectedResult) throws Throwable {

        assertCurrentPage('noRecordPage')

        assertTextFieldEqualityForMap(expectedResult)
    }

    @Then("^the service displays the following (?:result|result page content)\$")
    public void the_service_displays_the_following_result(DataTable expectedResult) throws Throwable {

        assertCurrentPage('resultsPage')

        assertTextFieldEqualityForMap(expectedResult)
    }

    @Then("^the service displays the following page content\$")
    public void the_service_displays_the_following_page_content(DataTable expectedResult) throws Throwable {

        assertTextFieldEqualityForMap(expectedResult)
    }

    @Then("^the service displays the following (.*) headers in order\$")
    public void the_service_displays_the_following_your_search_headers_in_order(String tableName, DataTable expectedResult) throws Throwable {

        def tableId = toCamelCase(tableName) +"Table"

        verifyTableRowHeadersInOrder(expectedResult, tableId)
    }



}
