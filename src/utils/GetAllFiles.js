const fs = require("fs");
const path = require("path");

/**
 * Get all files in a directory and its subdirectories in lowercase
 * @param {string} directory The directory to search in
 * @returns {Array} An array of objects containing the filename and folder
 */
module.exports = (directory) => {
  // Create an empty array to store the results
  const files = [];

  // Recursively search the directory and its subdirectories
  function searchDirectory(dir) {
    // Get all files and directories in the current directory
    const items = fs.readdirSync(dir, { withFileTypes: true });

    // Loop through each item
    for (const item of items) {
      // If the item is a file, add it to the results array
      if (item.isFile()) {
        const { name, ext } = path.parse(item.name);
        const file = {
          name: name,
          category: path.relative(directory, dir),
        };
        files.push(file);
      }
      // If the item is a directory, recursively search it
      else if (item.isDirectory()) {
        const subdirectory = path.join(dir, item.name);
        searchDirectory(subdirectory);
      }
    }
  }

  // Start the search
  searchDirectory(directory);

  // Return the results
  return files;
};
