/**
 * Default code templates for executable code notes
 */

export const DEFAULT_CODE = {
  language: 'javascript',
  code: `// Welcome to your code note!
// Write your code here and click Run to execute

console.log('Hello, World!');

// Example: Calculate factorial
function factorial(n) {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}

console.log('Factorial of 5:', factorial(5));`
};

export const CODE_TEMPLATES = {
  javascript: {
    language: 'javascript',
    code: `// JavaScript Example
console.log('Hello from JavaScript!');

// Array manipulation
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(n => n * 2);
console.log('Doubled:', doubled);

// Object destructuring
const person = { name: 'Alice', age: 30 };
const { name, age } = person;
console.log(\`\${name} is \${age} years old\`);`
  },
  python: {
    language: 'python',
    code: `# Python Example
print('Hello from Python!')

# List comprehension
numbers = [1, 2, 3, 4, 5]
doubled = [n * 2 for n in numbers]
print('Doubled:', doubled)

# Dictionary
person = {'name': 'Alice', 'age': 30}
print(f"{person['name']} is {person['age']} years old")

# Function
def greet(name):
    return f"Hello, {name}!"

print(greet('World'))`
  },
  typescript: {
    language: 'typescript',
    code: `// TypeScript Example
interface Person {
  name: string;
  age: number;
}

const greet = (person: Person): string => {
  return \`Hello, \${person.name}! You are \${person.age} years old.\`;
};

const alice: Person = { name: 'Alice', age: 30 };
console.log(greet(alice));

// Type inference
const numbers: number[] = [1, 2, 3, 4, 5];
const doubled = numbers.map(n => n * 2);
console.log('Doubled:', doubled);`
  },
  java: {
    language: 'java',
    code: `// Java Example
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello from Java!");

        // Array
        int[] numbers = {1, 2, 3, 4, 5};
        int sum = 0;
        for (int num : numbers) {
            sum += num;
        }
        System.out.println("Sum: " + sum);

        // Method call
        System.out.println(greet("World"));
    }

    public static String greet(String name) {
        return "Hello, " + name + "!";
    }
}`
  },
  cpp: {
    language: 'cpp',
    code: `// C++ Example
#include <iostream>
#include <vector>
using namespace std;

int main() {
    cout << "Hello from C++!" << endl;

    // Vector
    vector<int> numbers = {1, 2, 3, 4, 5};
    int sum = 0;
    for (int num : numbers) {
        sum += num;
    }
    cout << "Sum: " << sum << endl;

    return 0;
}`
  },
  python_data: {
    language: 'python',
    code: `# Python Data Analysis Example
# Calculate statistics

data = [10, 20, 30, 40, 50]

# Mean
mean = sum(data) / len(data)
print(f'Mean: {mean}')

# Median
sorted_data = sorted(data)
n = len(sorted_data)
median = sorted_data[n//2] if n % 2 != 0 else (sorted_data[n//2-1] + sorted_data[n//2]) / 2
print(f'Median: {median}')

# Range
range_val = max(data) - min(data)
print(f'Range: {range_val}')`
  },
  javascript_async: {
    language: 'javascript',
    code: `// JavaScript Async/Await Example
// Working with Promises

async function processData(id) {
  // Return a resolved promise immediately
  return Promise.resolve({
    id,
    name: \`User \${id}\`,
    status: 'active'
  });
}

async function main() {
  console.log('Processing user data...');

  const user = await processData(1);
  console.log('User:', JSON.stringify(user));

  // Multiple async operations
  const users = await Promise.all([
    processData(1),
    processData(2),
    processData(3)
  ]);
  console.log('Total users:', users.length);

  console.log('Done!');
}

main();`
  },
  python_algorithm: {
    language: 'python',
    code: `# Python Algorithm Example
# Binary Search

def binary_search(arr, target):
    left, right = 0, len(arr) - 1

    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1

    return -1

# Test
numbers = [1, 3, 5, 7, 9, 11, 13, 15]
target = 7
result = binary_search(numbers, target)
print(f'Found {target} at index: {result}')`
  }
};
