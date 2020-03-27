// @flow
// @flow-runtime enable

import { reify } from 'flow-runtime'
import type Type from 'flow-runtime'

export type FactoryType = {
    type: *,
    valueOverridesMap?: Object,
    typeDefaultsOverridesMap?: Object,
}

let valueOverrides = {}

let typedDefaultOverrides = {}

export const typeDefaultsMap = {
    StringType: 'string_value',
    NumberType: 1,
    BooleanType: true,
    VoidType: null,
    NullableType: undefined,
    ExistentialType: {},
    FunctionType: () => {},
    DateType: new Date(),
    $PropertyType: '$PropertyType',
}

const primitiveTypes = [
    'StringType',
    'NumberType',
    'BooleanType',
    'VoidType',
    'FunctionType',
    'ExistentialType',
    'NullableType',
    'DateType',
    '$PropertyType',
]

const generatorMapping = {}

const buildMockObject = (type: Type, overrideTypeName?: string): Object => {
    const typeName: string = overrideTypeName || (reify: Type<type>).typeName

    const generator = generatorMapping[typeName]

    if (!generator) {
        throw new Error(
            `Unknown type '${typeName}' - If you want to create a mock for this type please update the factory to handle it.`
        )
    }

    return generator(type)
}


const generateObjectProperty = (type: Type): Object => {
    let value

    if (Object.keys(valueOverrides).includes(type.key)) {
        const override = valueOverrides[type.key]
        value = typeof override === 'function' ? override() : override
    } else {
        value = buildMockObject(type.value)
    }

    return {
        [type.key]: value,
    }
}

const generateObjectType = (type: Type) => {
    const props = type.properties.map((objectType: Type) => buildMockObject(objectType))
    const obj = {}
    props.map((mock: Object) => Object.assign(obj, mock))
    return obj
}


const generateValue = (type: Type): * =>
    Object.keys(typedDefaultOverrides).includes(type.typeName)
        ? typedDefaultOverrides[type.typeName]
        : typeDefaultsMap[type.typeName]


primitiveTypes.forEach((primitiveType: string) => {
    generatorMapping[primitiveType] = generateValue
})

generatorMapping.TypeAlias = (type: Type) => buildMockObject(type.type)
generatorMapping.ObjectType = (type: Type) => generateObjectType(type)
generatorMapping.ObjectTypeProperty = (type: Type) => generateObjectProperty(type)
generatorMapping.ArrayType = (type: Type) => [buildMockObject(type.elementType)]
generatorMapping.UnionType = (type: Type) => type.types[0].value
generatorMapping.TypeTDZ = (type: Type) => buildMockObject(type.reveal())
generatorMapping.ParameterizedTypeAlias = () => ({}) // Not sure how to handle this

generatorMapping.TypeParameterApplication = (type: Type) => buildMockObject(type, type.parent.name)
generatorMapping.$ReadOnlyArray = (type: Type) => [buildMockObject(type.typeInstances[0])]
generatorMapping.$KeysType = (type: Type) => type.unwrap().types[0].value

// Add more exotics types here ...

export const generateMockObject = ({type, valueOverridesMap = {}, typeDefaultsOverridesMap = {},}: FactoryType = {}): Object => {
    if (!type) {
        throw new Error('Must provide a type')
    }

    // Set overrides and defaults
    valueOverrides = valueOverridesMap
    typedDefaultOverrides = typeDefaultsOverridesMap

    return buildMockObject(type)
}
