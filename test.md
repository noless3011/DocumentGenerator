Okay, this is a comprehensive set of exercises for a Java Web Application workshop. I'll provide the code for each part.

You'll typically set this up as a "Dynamic Web Project" in an IDE like Eclipse or IntelliJ IDEA.

**Project Structure (Typical):**

```
YourProjectName/
├── src/
│   └── main/
│       └── java/
│           └── com/
│               └── example/
│                   ├── Ex1Servlet.java
│                   ├── Ex2Servlet.java
│                   └── Ex3Servlet.java
├── src/
│   └── main/
│       └── webapp/
│           ├── index.html
│           ├── ex1_result.jsp  (or just display on index.html/same page)
│           ├── ex2_result.jsp
│           ├── ex3_result.jsp
│           └── WEB-INF/
│               └── web.xml
└── pom.xml (if using Maven, for dependencies like servlet-api)
```

If not using Maven, ensure the Servlet API JAR (e.g., `javax.servlet-api-4.0.1.jar` or similar from your Tomcat/Servlet container's `lib` folder) is on your project's build path.

**1. `index.html` (Main page for all exercises)**

```html
<!DOCTYPE html>
<html>
<head>
    <title>Workshop 1</title>
    <style>
        body { font-family: sans-serif; margin: 20px; }
        h2 { border-bottom: 1px solid #ccc; padding-bottom: 5px; }
        .exercise { margin-bottom: 30px; padding: 15px; border: 1px solid #eee; border-radius: 5px; background-color: #f9f9f9;}
        label { display: inline-block; margin-right: 10px; }
        input[type="text"], select { margin-bottom: 10px; padding: 8px; border: 1px solid #ccc; border-radius: 3px; }
        input[type="submit"], input[type="reset"], button { padding: 8px 15px; margin-right: 5px; background-color: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer; }
        input[type="submit"]:hover, input[type="reset"]:hover, button:hover { background-color: #0056b3; }
        .error { color: red; font-weight: bold; }
        .result { color: green; font-weight: bold; margin-top:10px; }
    </style>
</head>
<body>

    <h1>Workshop 1 Exercises</h1>

    <!-- EXERCISE 1 -->
    <div class="exercise">
        <h2>EX1 (4p): Sum Odd/Even from 1 to n</h2>
        <form action="sum" method="POST">
            Enter an integer number n: <input type="text" name="n" size="10">
            <br>
            <input type="radio" name="choice" value="odd" id="sumOdd"> <label for="sumOdd">Sum odd</label>
            <input type="radio" name="choice" value="even" id="sumEven"> <label for="sumEven">Sum even</label>
            <br><br>
            <input type="submit" value="Execute">
        </form>
        <!-- Result for Ex1 will be shown by Ex1Servlet via ex1_result.jsp or by redirecting back with parameters -->
        <%
            String ex1Message = (String) request.getAttribute("ex1_message");
            if (ex1Message != null) {
        %>
            <p class="<%=(ex1Message.startsWith("Error:") || ex1Message.startsWith("You must")) ? "error" : "result"%>">
                <%= ex1Message %>
            </p>
        <%
            }
        %>
    </div>

    <hr>

    <!-- EXERCISE 2 -->
    <div class="exercise">
        <h2>EX2 (3p): Calculator</h2>
        <form action="calculate" method="POST">
            Enter number 1: <input type="text" name="num1" size="10"> <br>
            Enter number 2: <input type="text" name="num2" size="10"> <br>
            Operator:
            <select name="operator">
                <option value="add">Add (+)</option>
                <option value="subtract">Subtract (-)</option>
                <option value="multiply">Multiply (*)</option>
                <option value="divide">Divide (/)</option>
                <option value="gcd">GCD</option>
                <option value="lcm">LCM</option>
            </select>
            <br><br>
            <input type="submit" value="Calculate">
            <input type="reset" value="Reset">
        </form>
         <%
            String ex2Message = (String) request.getAttribute("ex2_message");
            if (ex2Message != null) {
        %>
            <p class="<%=(ex2Message.startsWith("Error:")) ? "error" : "result"%>">
                <%= ex2Message %>
            </p>
        <%
            }
        %>
    </div>

    <hr>

    <!-- EXERCISE 3 -->
    <div class="exercise">
        <h2>EX3 (3p): Array Sum Odd/Even</h2>
        <form action="arraysum" method="GET">
            Enter an integer array (comma separated, e.g., 1,2,3,4,5):
            <input type="text" name="arrayInput" size="40">
            <br>
            Choose an option:
            <input type="radio" name="arrayChoice" value="odd" id="arrayOdd"> <label for="arrayOdd">Odd</label>
            <input type="radio" name="arrayChoice" value="even" id="arrayEven"> <label for="arrayEven">Even</label>
            <br><br>
            <input type="submit" value="SUM">
        </form>
        <%
            String ex3Message = (String) request.getAttribute("ex3_message");
            if (ex3Message != null) {
        %>
            <p class="<%=(ex3Message.startsWith("Error:") || ex3Message.startsWith("You must")) ? "error" : "result"%>">
                <%= ex3Message %>
            </p>
        <%
            }
        %>
    </div>

</body>
</html>
```

**Note on `index.html` vs `index.jsp`**: I've written it as `index.html` but included JSP scriptlets `<% ... %>` to display results directly on the same page. For this to work, you should rename `index.html` to `index.jsp` and make it your welcome file in `web.xml`. If you prefer separate result pages, remove the scriptlets and create `ex1_result.jsp`, `ex2_result.jsp`, `ex3_result.jsp`. I'll proceed with the assumption you rename it to `index.jsp`.

**2. `WEB-INF/web.xml`**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<web-app xmlns="http://xmlns.jcp.org/xml/ns/javaee"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://xmlns.jcp.org/xml/ns/javaee
                             http://xmlns.jcp.org/xml/ns/javaee/web-app_4_0.xsd"
         version="4.0">

    <display-name>Workshop1App</display-name>

    <welcome-file-list>
        <welcome-file>index.jsp</welcome-file> <!-- Or index.html if you don't use JSP on the main page -->
    </welcome-file-list>

    <!-- Servlet for Exercise 1 -->
    <servlet>
        <servlet-name>Ex1Servlet</servlet-name>
        <servlet-class>com.example.Ex1Servlet</servlet-class>
    </servlet>
    <servlet-mapping>
        <servlet-name>Ex1Servlet</servlet-name>
        <url-pattern>/sum</url-pattern>
    </servlet-mapping>

    <!-- Servlet for Exercise 2 -->
    <servlet>
        <servlet-name>Ex2Servlet</servlet-name>
        <servlet-class>com.example.Ex2Servlet</servlet-class>
    </servlet>
    <servlet-mapping>
        <servlet-name>Ex2Servlet</servlet-name>
        <url-pattern>/calculate</url-pattern>
    </servlet-mapping>

    <!-- Servlet for Exercise 3 -->
    <servlet>
        <servlet-name>Ex3Servlet</servlet-name>
        <servlet-class>com.example.Ex3Servlet</servlet-class>
    </servlet>
    <servlet-mapping>
        <servlet-name>Ex3Servlet</servlet-name>
        <url-pattern>/arraysum</url-pattern>
    </servlet-mapping>

</web-app>
```

**3. Java Servlets**

Create these in the `com.example` package (or your chosen package).

**`com/example/Ex1Servlet.java`**

```java
package com.example;

import java.io.IOException;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
// For older servlet versions, use:
// import javax.servlet.ServletException;
// import javax.servlet.http.HttpServlet;
// import javax.servlet.http.HttpServletRequest;
// import javax.servlet.http.HttpServletResponse;


public class Ex1Servlet extends HttpServlet {
    private static final long serialVersionUID = 1L;

    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        String nStr = request.getParameter("n");
        String choice = request.getParameter("choice");
        String message = "";

        if (choice == null || choice.isEmpty()) {
            message = "You must choose an option";
        } else {
            try {
                int n = Integer.parseInt(nStr);
                if (n <= 5) {
                    message = "You must input an integer > 5";
                } else {
                    long sum = 0;
                    if ("odd".equals(choice)) {
                        for (int i = 1; i <= n; i++) {
                            if (i % 2 != 0) {
                                sum += i;
                            }
                        }
                        message = "Sum of odd numbers from 1 to " + n + " is: " + sum;
                        // Example: n=6 -> 1+3+5 = 9
                    } else if ("even".equals(choice)) {
                        for (int i = 1; i <= n; i++) {
                            if (i % 2 == 0) {
                                sum += i;
                            }
                        }
                        message = "Sum of even numbers from 1 to " + n + " is: " + sum;
                        // Example: n=6 -> 2+4+6 = 12
                    }
                }
            } catch (NumberFormatException e) {
                message = "You must input an integer > 5"; // Also covers non-integer case
            }
        }

        request.setAttribute("ex1_message", message);
        request.getRequestDispatcher("index.jsp").forward(request, response);
    }
}
```

**`com/example/Ex2Servlet.java`**

```java
package com.example;

import java.io.IOException;
import java.text.DecimalFormat;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

public class Ex2Servlet extends HttpServlet {
    private static final long serialVersionUID = 1L;

    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        String num1Str = request.getParameter("num1");
        String num2Str = request.getParameter("num2");
        String operator = request.getParameter("operator");
        String message = "";

        try {
            double num1 = Double.parseDouble(num1Str);
            double num2 = Double.parseDouble(num2Str);
            double result = 0;
            boolean calculationDone = true;

            switch (operator) {
                case "add":
                    result = num1 + num2;
                    break;
                case "subtract":
                    result = num1 - num2;
                    break;
                case "multiply":
                    result = num1 * num2;
                    break;
                case "divide":
                    if (num2 == 0) {
                        message = "Error: Cannot divide by zero.";
                        calculationDone = false;
                    } else {
                        result = num1 / num2;
                    }
                    break;
                case "gcd":
                    if (isInteger(num1) && isInteger(num2)) {
                        result = gcd((int)num1, (int)num2);
                    } else {
                        message = "Error: GCD requires integer inputs.";
                        calculationDone = false;
                    }
                    break;
                case "lcm":
                     if (isInteger(num1) && isInteger(num2)) {
                        if (num1 == 0 || num2 == 0) {
                             result = 0; // LCM with 0 is 0
                        } else {
                            result = lcm((int)num1, (int)num2);
                        }
                    } else {
                        message = "Error: LCM requires integer inputs.";
                        calculationDone = false;
                    }
                    break;
                default:
                    message = "Error: Invalid operator.";
                    calculationDone = false;
            }

            if (calculationDone) {
                DecimalFormat df = new DecimalFormat("#.##########"); // Avoid scientific notation for large/small doubles
                message = "Result: " + df.format(result);
            }

        } catch (NumberFormatException e) {
            message = "Error: Please enter valid numbers.";
        } catch (Exception e) {
            message = "Error: An unexpected error occurred: " + e.getMessage();
        }

        request.setAttribute("ex2_message", message);
        request.getRequestDispatcher("index.jsp").forward(request, response);
    }

    private boolean isInteger(double number) {
        return number == Math.floor(number) && !Double.isInfinite(number);
    }

    private int gcd(int a, int b) {
        a = Math.abs(a);
        b = Math.abs(b);
        while (b != 0) {
            int temp = b;
            b = a % b;
            a = temp;
        }
        return a;
    }

    private int lcm(int a, int b) {
        if (a == 0 || b == 0) return 0;
        return Math.abs(a * b) / gcd(a, b);
    }
}
```

**`com/example/Ex3Servlet.java`**

```java
package com.example;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

public class Ex3Servlet extends HttpServlet {
    private static final long serialVersionUID = 1L;

    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        String arrayInputStr = request.getParameter("arrayInput");
        String arrayChoice = request.getParameter("arrayChoice");
        String message = "";

        if (arrayInputStr == null || arrayInputStr.trim().isEmpty()) {
            message = "Error: Array input cannot be empty.";
        } else if (arrayChoice == null || arrayChoice.isEmpty()) {
            message = "You must choose an option (Odd/Even)."; // Similar to Ex1 for consistency
        } else {
            String[] strNumbers = arrayInputStr.split(",");
            List<Integer> numbers = new ArrayList<>();
            boolean validInput = true;

            for (String sNum : strNumbers) {
                try {
                    int num = Integer.parseInt(sNum.trim());
                    if (num <= 0) { // "integer numbers > 0"
                        message = "You must input an integer array (all elements must be integers > 0).";
                        validInput = false;
                        break;
                    }
                    numbers.add(num);
                } catch (NumberFormatException e) {
                    message = "You must input an integer array (all elements must be integers > 0).";
                    validInput = false;
                    break;
                }
            }

            if (validInput && numbers.isEmpty() && !arrayInputStr.trim().isEmpty()){
                 // This case could happen if input was just "," or ",,"
                 message = "You must input an integer array (all elements must be integers > 0).";
                 validInput = false;
            }


            if (validInput) {
                long sum = 0;
                if ("odd".equals(arrayChoice)) {
                    for (int num : numbers) {
                        if (num % 2 != 0) {
                            sum += num;
                        }
                    }
                    message = "Sum of ODD elements in the array is: " + sum;
                    // Example: a=1,2,3,4,5 -> 1+3+5 = 9
                } else if ("even".equals(arrayChoice)) {
                    for (int num : numbers) {
                        if (num % 2 == 0) {
                            sum += num;
                        }
                    }
                    message = "Sum of EVEN elements in the array is: " + sum;
                     // Example: a=1,2,3,4,5 -> 2+4 = 6
                }
            }
        }

        request.setAttribute("ex3_message", message);
        request.getRequestDispatcher("index.jsp").forward(request, response);
    }
}
```

**To Run This:**

1.  Create a Dynamic Web Project in your IDE.
2.  Place `index.html` (rename to `index.jsp`) in the `webapp` (or `WebContent`) directory.
3.  Place `web.xml` in `webapp/WEB-INF/`.
4.  Create the package `com.example` under `src/main/java` (or `src`) and add the three servlet `.java` files there.
5.  Ensure your project has the Servlet API library (usually provided by your server like Tomcat, but you might need to add it as a dependency for compilation, e.g., `javax.servlet:javax.servlet-api:4.0.1` with scope `provided` if using Maven).
6.  Deploy the project to a Servlet container (e.g., Apache Tomcat).
7.  Access the application via `http://localhost:8080/YourProjectName/` (the port and project name might vary).

This comprehensive solution should cover all the requirements of your workshop. Remember to adjust package names or paths if your project structure differs.
