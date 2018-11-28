// Convenience function to extract and rename fields,
// for example from a Sequelize result object.
//
// Fields are copied from 'source' into 'dest' according
// to 'mapping'. They keys of 'mapping' correspond to properties
// in 'source', and the value of each key is the name of the
// property in 'dest'.
//
// For convenience, 'dest' is returned.
//
// Example usage:
//
// var dog = { dog_name: "Fido", dog_years: 26 };
// var new_dog = mapFields(dog, {}, { "dog_name": "name", "dog_years": "age" });
//
// new_dog would now contain { name: "Fido", age: 26 }.
module.exports = function mapFields(source, dest, mapping) {
  Object.keys(mapping).forEach(function(key) {
    const newKey = mapping[key];
    if (source[key] !== undefined) {
      dest[newKey] = source[key];
    }
  });

  return dest;
};
