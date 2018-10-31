module.exports = function mapFields(source, dest, mapping) {
  Object.keys(mapping).forEach(function(key) {
    const newKey = mapping[key];
    if (source[key]) {
      dest[newKey] = source[key];
    }
  });

  return dest;
};
